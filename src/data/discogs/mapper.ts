import type { Album } from '../../domain/types';

/** The subset of a Discogs `/database/search` result (type=master) that we use. */
export interface DiscogsSearchResult {
  id: number;
  master_id?: number;
  type?: string;
  /** "Artist - Album Title" */
  title: string;
  year?: string;
  genre?: string[];
  /** e.g. ["Vinyl", "LP", "Album"] or ["CD", "Single"]. Absent on some results. */
  format?: string[];
  style?: string[];
  cover_image?: string;
  thumb?: string;
  uri?: string;
  community?: { want?: number; have?: number };
}

import { categoryOf } from '../../game/categories';
import type { Category } from '../../domain/types';

export const METAL_STYLES = [
  'Heavy Metal',
  'Thrash',
  'Death Metal',
  'Black Metal',
  'Doom Metal',
  'Speed Metal',
  'Power Metal',
  'Progressive Metal',
  'Grindcore',
  'Stoner Rock',
  'Folk Metal',
  'Gothic Metal',
  'Groove Metal',
  'Symphonic Metal',
];

/**
 * Search results usually carry no image (the fields come back empty), so the cover is resolved later from
 * `/masters/{id}`. If a result does include a real image we keep it. "spacer.gif" is Discogs' placeholder.
 */
export function searchImage(r: DiscogsSearchResult): string {
  const url = r.cover_image;
  return url && !url.includes('spacer.gif') && /^https?:\/\//.test(url) ? url : '';
}

/** Keeps studio-album-like releases. Results without format info are kept. */
export function isAlbumFormat(format?: string[]): boolean {
  if (!format || format.length === 0) return true;
  const f = format.map((x) => x.toLowerCase());
  const excluded = ['single', 'ep', 'compilation', 'mini-album', 'maxi-single', 'promo', 'sampler'];
  return f.includes('album') && !f.some((x) => excluded.includes(x));
}

/** Splits "Artist - Album" on the first " - ". Discogs also disambiguates artists as "Name (2)". */
export function splitTitle(title: string): { artist: string; albumTitle: string } | null {
  const i = title.indexOf(' - ');
  if (i < 1) return null;
  const artist = title.slice(0, i).replace(/\s\(\d+\)$/, '').trim();
  const albumTitle = title.slice(i + 3).trim();
  return artist && albumTitle ? { artist, albumTitle } : null;
}

/** Owners of the most collected metal masters are in the tens of thousands. */
const OWNERS_AT_100 = 30000;

/** 0..100 on a log scale with a fixed reference, so scores mean the same thing whichever pages were fetched. */
export function popularityFromOwners(have: number): number {
  const p = (Math.log10(Math.max(have, 0) + 1) / Math.log10(OWNERS_AT_100)) * 100;
  return Math.round(Math.min(100, Math.max(0, p)));
}

/**
 * Maps search results to albums. Popularity is derived from how many Discogs users own the release
 * (`community.have`) on a fixed log scale.
 */
export function mapDiscogsResults(results: DiscogsSearchResult[]): Album[] {
  const usable = results.filter((r) => isAlbumFormat(r.format) && splitTitle(r.title) && Number(r.year) > 1960);
  const seen = new Set<string>();
  const albums: Album[] = [];

  for (const r of usable) {
    const parts = splitTitle(r.title)!;
    const key = `${parts.artist}|${parts.albumTitle}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const styles = r.style ?? [];
    const subgenre = styles.find((s) => s !== 'Heavy Metal') ?? styles[0] ?? 'Heavy Metal';
    const have = r.community?.have ?? 0;
    const popularity = popularityFromOwners(have);

    const masterId = String(r.master_id || r.id);
    albums.push({
      id: `discogs-${masterId}`,
      sourceId: masterId,
      artist: parts.artist,
      albumTitle: parts.albumTitle,
      year: Number(r.year),
      genre: 'Metal',
      subgenre,
      coverImageUrl: searchImage(r),
      discogsUrl: r.uri ? `https://www.discogs.com${r.uri}` : `https://www.discogs.com/master/${masterId}`,
      popularityScore: popularity,
      difficultyScore: Math.min(100, Math.max(0, 100 - popularity)),
      visualStyle: subgenre,
    });
  }
  return albums;
}

/** Discogs styles worth querying for a category, so a genre pick fetches fewer pages. */
export function stylesFor(category: Category): string[] {
  return category === 'all' ? METAL_STYLES : METAL_STYLES.filter((s) => categoryOf(s) === category);
}
