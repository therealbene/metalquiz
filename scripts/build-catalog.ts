/**
 * Builds public/albums.json from Discogs, once, so the live app needs no Discogs calls to pick albums.
 *
 *   npm run catalog                  full run (about 13 minutes, ~780 requests)
 *   npm run catalog -- --small       quick test: 3 styles, 2 pages, 10 albums per genre
 *   npm run catalog -- --no-text     skip the text detection step (no python/tesseract needed)
 *
 * Needs DISCOGS_TOKEN (read from .env.local by the npm script). Progress is cached in scripts/.catalog-cache.json,
 * so an interrupted run continues where it stopped. Delete that file to start fresh.
 *
 * After the covers are resolved, each cover image is downloaded (scripts/.covers) and scripts/detect_text.py marks the
 * regions that contain lettering, stored per album as `avoidRegions`. The browser cannot read Discogs images
 * (no CORS headers), so this has to happen here. Needs python3 with Pillow, numpy and scipy, and the tesseract command.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Album, Category } from '../src/domain/types';
import { categoryOf } from '../src/game/categories';
import { mapDiscogsResults, METAL_STYLES, popularityFromOwners, type DiscogsSearchResult } from '../src/data/discogs/mapper';
import { RateLimiter } from '../src/data/discogs/rateLimiter';

const SMALL = process.argv.includes('--small');
const DETECT_TEXT = !process.argv.includes('--no-text');
const COVERS_DIR = 'scripts/.covers';
const TEXT_CACHE = 'scripts/.text-cache.json';
const TOKEN = process.env.DISCOGS_TOKEN;
const OUT = 'public/albums.json';
const CACHE = 'scripts/.catalog-cache.json';
const PAGES = SMALL ? 2 : 12;
const STYLES = SMALL ? METAL_STYLES.slice(0, 3) : METAL_STYLES;
/** How many albums to keep per genre. */
const PER_GENRE: Record<Exclude<Category, 'all'>, number> = SMALL
  ? { heavy: 10, thrash: 10, death: 10, black: 10, doom: 10, sludge: 10, grind: 10 }
  : { heavy: 280, thrash: 200, death: 210, black: 210, doom: 190, sludge: 130, grind: 150 };
const MAX_PER_ARTIST = 3;
/** Always keep this many of the most owned albums per genre; fill the rest across the popularity range. */
const TOP_SHARE = 0.4;
const MIN_OWNERS = 25;
const MIN_POPULARITY = popularityFromOwners(MIN_OWNERS);

if (!TOKEN) {
  console.error('DISCOGS_TOKEN is not set. Run via `npm run catalog` so .env.local is loaded.');
  process.exit(1);
}

interface Cache {
  search: Record<string, DiscogsSearchResult[]>;
  covers: Record<string, string | null>;
}
const cache: Cache = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, 'utf8')) : { search: {}, covers: {} };
const save = () => writeFileSync(CACHE, JSON.stringify(cache));

const limiter = new RateLimiter(1100);
async function get<T>(path: string): Promise<T> {
  for (let attempt = 0; attempt < 5; attempt++) {
    await limiter.acquire();
    const res = await fetch(`https://api.discogs.com${path}`, {
      headers: {
        Authorization: `Discogs token=${TOKEN}`,
        'User-Agent': 'MetalCoverQuiz-CatalogBuilder/1.0',
        Accept: 'application/vnd.discogs.v2.discogs+json',
      },
    });
    if (res.status === 429) {
      const wait = Number(res.headers.get('Retry-After')) || 60;
      console.log(`  rate limited, waiting ${wait}s`);
      limiter.backoff(wait * 1000);
      continue;
    }
    if (!res.ok) throw new Error(`${res.status} for ${path}`);
    return (await res.json()) as T;
  }
  throw new Error(`Gave up on ${path}`);
}

/** Titles that are not a studio album, plus split releases ("Band A / Band B"). */
const NOT_A_STUDIO_ALBUM =
  /\b(live|demo|demos|split|compilation|best of|anthology|collection|collected|remaster(ed)?|bootleg|sampler|tribute|greatest hits|singles|rarities|rehearsal|unplugged|ep|tape)\b/i;

function wanted(a: Album): boolean {
  if (NOT_A_STUDIO_ALBUM.test(a.albumTitle)) return false;
  if (a.artist.includes(' / ') || /^various$/i.test(a.artist)) return false;
  return true;
}

async function fetchSearch(): Promise<DiscogsSearchResult[]> {
  const all: DiscogsSearchResult[] = [];
  let n = 0;
  const total = STYLES.length * PAGES;
  for (const style of STYLES) {
    for (let page = 1; page <= PAGES; page++) {
      n++;
      const key = `${style}|${page}`;
      if (!cache.search[key]) {
        const q = new URLSearchParams({ type: 'master', genre: 'Rock', style, per_page: '100', page: String(page) });
        let data: { results: DiscogsSearchResult[] };
        try {
          data = await get<{ results: DiscogsSearchResult[] }>(`/database/search?${q}`);
        } catch (e) {
          // A page past the last one of a small style answers 404: no more results for this style.
          if (!(e as Error).message.startsWith('404')) throw e;
          data = { results: [] };
        }
        cache.search[key] = data.results.map(({ id, master_id, title, year, style: st, format, community }) => ({
          id, master_id, title, year, style: st, format, community, cover_image: '', uri: undefined,
        }) as DiscogsSearchResult);
        // keep the uri for the Discogs link
        data.results.forEach((r, i) => (cache.search[key][i].uri = r.uri));
        save();
        console.log(`search ${n}/${total}: ${style} p${page} (${data.results.length})`);
      }
      all.push(...cache.search[key]);
    }
  }
  return all;
}

/** Stable pseudo-random order per album, so the sample does not reshuffle when the targets grow. */
function hashKey(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}

/** Ids already in the published catalogue. They are always kept, so growing the catalogue only ever adds albums. */
const previousIds = new Set<string>(
  existsSync(OUT) ? (JSON.parse(readFileSync(OUT, 'utf8')).albums as Album[]).map((a) => a.id) : [],
);

function select(albums: Album[]): Album[] {
  const chosen: Album[] = [];
  for (const cat of Object.keys(PER_GENRE) as (keyof typeof PER_GENRE)[]) {
    const want = PER_GENRE[cat];
    const pool = albums
      .filter((a) => categoryOf(a.subgenre) === cat && wanted(a))
      .sort((a, b) => b.popularityScore - a.popularityScore);

    const perArtist = new Map<string, number>();
    const take = (a: Album) => perArtist.set(a.artist, (perArtist.get(a.artist) ?? 0) + 1);
    const kept = pool.filter((a) => previousIds.has(a.id));
    kept.forEach(take);

    // New albums respect the per-artist cap; most collected first, then a stable sample of the rest.
    const fresh = pool.filter((a) => !previousIds.has(a.id) && (perArtist.get(a.artist) ?? 0) < MAX_PER_ARTIST);
    const need = Math.max(0, want - kept.length);
    const top: Album[] = [];
    const sample: Album[] = [];
    const topWanted = Math.round(need * TOP_SHARE);
    for (const a of fresh) {
      if (top.length >= topWanted) break;
      if ((perArtist.get(a.artist) ?? 0) >= MAX_PER_ARTIST) continue;
      top.push(a);
      take(a);
    }
    const rest = fresh.filter((a) => !top.includes(a)).sort((x, y) => hashKey(x.id) - hashKey(y.id));
    for (const a of rest) {
      if (top.length + sample.length >= need) break;
      if ((perArtist.get(a.artist) ?? 0) >= MAX_PER_ARTIST) continue;
      sample.push(a);
      take(a);
    }
    chosen.push(...kept, ...top, ...sample);
    console.log(`${cat}: ${pool.length} candidates -> ${kept.length} kept + ${top.length + sample.length} new`);
  }
  // an album can match once only, but keep ids unique to be safe
  return [...new Map(chosen.map((a) => [a.id, a])).values()];
}

async function resolveCovers(albums: Album[]): Promise<Album[]> {
  const out: Album[] = [];
  let n = 0;
  for (const album of albums) {
    n++;
    const id = album.sourceId!;
    if (!(id in cache.covers)) {
      try {
        const data = await get<{ images?: { type?: string; uri?: string; uri150?: string }[] }>(`/masters/${id}`);
        const images = data.images ?? [];
        const best = images.find((i) => i.type === 'primary') ?? images[0];
        cache.covers[id] = best?.uri || best?.uri150 || null;
      } catch (e) {
        console.log(`  cover failed for ${id}: ${(e as Error).message}`);
        cache.covers[id] = null;
      }
      if (n % 10 === 0) {
        save();
        console.log(`covers ${n}/${albums.length}`);
      }
    }
    const url = cache.covers[id];
    if (url) out.push({ ...album, coverImageUrl: url });
  }
  save();
  return out;
}

async function downloadImages(albums: Album[]): Promise<void> {
  mkdirSync(COVERS_DIR, { recursive: true });
  let n = 0;
  for (const a of albums) {
    n++;
    const file = `${COVERS_DIR}/${a.id}.jpg`;
    if (existsSync(file)) continue;
    try {
      const res = await fetch(a.coverImageUrl, { headers: { 'User-Agent': 'MetalCoverQuiz-CatalogBuilder/1.0' } });
      if (!res.ok) throw new Error(String(res.status));
      writeFileSync(file, Buffer.from(await res.arrayBuffer()));
    } catch (e) {
      console.log(`  image failed for ${a.id}: ${(e as Error).message}`);
    }
    if (n % 25 === 0) console.log(`images ${n}/${albums.length}`);
    await new Promise((r) => setTimeout(r, 150)); // be polite to the image host
  }
}

/** Adds `avoidRegions` (rectangles with lettering) from the text detector. */
async function withTextRegions(albums: Album[]): Promise<Album[]> {
  await downloadImages(albums);
  execFileSync('python3', ['scripts/detect_text.py', COVERS_DIR, TEXT_CACHE], { stdio: 'inherit' });
  const found: Record<string, [number, number, number, number][]> = JSON.parse(readFileSync(TEXT_CACHE, 'utf8'));
  return albums.map((a) => ({
    ...a,
    avoidRegions: (found[a.id] ?? []).map(([x, y, w, h]) => ({ x, y, w, h })),
  }));
}

interface Overrides {
  avoid?: Record<string, [number, number, number, number][]>;
  exclude?: string[];
}
const OVERRIDES_FILE = 'scripts/catalog-overrides.json';
const overrides: Overrides = existsSync(OVERRIDES_FILE) ? JSON.parse(readFileSync(OVERRIDES_FILE, 'utf8')) : {};

/** Applies the hand-written fixes: extra regions to avoid, and albums to drop. */
function withOverrides(albums: Album[]): Album[] {
  const drop = new Set(overrides.exclude ?? []);
  return albums
    .filter((a) => !drop.has(a.id))
    .map((a) => {
      const extra = (overrides.avoid?.[a.id] ?? []).map(([x, y, w, h]) => ({ x, y, w, h }));
      return extra.length ? { ...a, avoidRegions: [...(a.avoidRegions ?? []), ...extra] } : a;
    });
}

const results = await fetchSearch();
const mapped = mapDiscogsResults(results).filter((a) => a.popularityScore >= MIN_POPULARITY);
console.log(`${results.length} search results -> ${mapped.length} albums with at least ${MIN_OWNERS} owners`);
const chosen = select(mapped);
const withCovers = await resolveCovers(chosen);
const albums = withOverrides(DETECT_TEXT ? await withTextRegions(withCovers) : withCovers);

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify({ version: 1, generatedAt: new Date().toISOString(), source: 'discogs', albums }));
console.log(`Wrote ${albums.length} albums to ${OUT} (${Math.round(readFileSync(OUT).length / 1024)} KB)`);
