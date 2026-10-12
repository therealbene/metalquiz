import type { Album, Category } from '../domain/types';
import type { AlbumSource } from './AlbumSource';
import { LocalStorageCache, type Cache } from './discogs/cache';
import { mapDiscogsResults, stylesFor, type DiscogsSearchResult } from './discogs/mapper';
import { RateLimiter } from './discogs/rateLimiter';

export interface DiscogsOptions {
  /** Personal access token. Without it Discogs returns no usable images. */
  token?: string;
  /**
   * Base URL. Point this at your own proxy in production so the token stays server-side
   * and you can set the User-Agent header Discogs asks for (browsers do not allow it).
   */
  baseUrl?: string;
  /** Stop fetching once this many playable albums were found. */
  minAlbums?: number;
  pagesPerStyle?: number;
  perPage?: number;
  /** Minimum gap between requests. 1100 ms stays under the 60/min authenticated limit. */
  minIntervalMs?: number;
  cache?: Cache;
  fetchImpl?: typeof fetch;
  limiter?: RateLimiter;
}

interface SearchResponse {
  results: DiscogsSearchResult[];
  pagination?: { pages?: number };
}

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Discogs-backed album source.
 *
 * - Rate limiting: requests are spaced out and 429 responses are retried after `Retry-After`.
 * - Caching: each search page is cached (metadata and image URLs only, not image files) for 7 days.
 * - Images: results without a real cover image are dropped, so every album is playable.
 * - Attribution: `attribution` must be shown in the UI. Discogs requires crediting the data and linking back.
 *
 * Not yet verified against the live API: it needs credentials. See README for setup.
 */
export class DiscogsAlbumSource implements AlbumSource {
  readonly name = 'discogs';
  readonly attribution = { text: 'Metadata and artwork via Discogs', href: 'https://www.discogs.com' };

  private readonly covers = new Map<string, string>();
  private readonly opts: Required<Omit<DiscogsOptions, 'token'>> & { token?: string };

  constructor(options: DiscogsOptions = {}) {
    this.opts = {
      baseUrl: 'https://api.discogs.com',
      minAlbums: 150,
      pagesPerStyle: 2,
      perPage: 100,
      minIntervalMs: 1100,
      cache: new LocalStorageCache(CACHE_TTL_MS),
      fetchImpl: (...args) => fetch(...args),
      limiter: new RateLimiter(options.minIntervalMs ?? 1100),
      // Drop undefined values so they do not override the defaults above.
      ...Object.fromEntries(Object.entries(options).filter(([, v]) => v !== undefined)),
    };
  }

  async getAlbums(signal?: AbortSignal, category: Category = 'all'): Promise<Album[]> {
    const all: DiscogsSearchResult[] = [];
    let albums: Album[] = [];
    // A single genre has fewer releases, so settle for a smaller pool there.
    const enough = category === 'all' ? this.opts.minAlbums : Math.min(this.opts.minAlbums, 60);

    outer: for (let page = 1; page <= this.opts.pagesPerStyle; page++) {
      for (const style of stylesFor(category)) {
        const data = await this.searchPage(style, page, signal);
        all.push(...data.results);
        albums = mapDiscogsResults(all);
        if (albums.length >= enough) break outer;
      }
    }
    return albums;
  }

  /**
   * Looks up the cover for one album via `/masters/{id}`. Search results have no image URLs.
   * Results are kept in memory only: Discogs image URLs are signed, so persisting them could leave stale links.
   */
  async resolveCover(album: Album, signal?: AbortSignal): Promise<Album> {
    if (album.coverImageUrl) return album;
    const id = album.sourceId;
    if (!id) throw new Error('Album has no Discogs id.');
    let url = this.covers.get(id);
    if (!url) {
      const data = await this.request<{ images?: { type?: string; uri?: string; uri150?: string }[] }>(
        `${this.opts.baseUrl}/masters/${id}`,
        signal,
      );
      const images = data.images ?? [];
      const best = images.find((i) => i.type === 'primary') ?? images[0];
      url = best?.uri || best?.uri150;
      if (!url) throw new Error('No cover image available.');
      this.covers.set(id, url);
    }
    return { ...album, coverImageUrl: url };
  }

  private async searchPage(style: string, page: number, signal?: AbortSignal): Promise<SearchResponse> {
    const params = new URLSearchParams({
      type: 'master',
      genre: 'Rock',
      style,
      per_page: String(this.opts.perPage),
      page: String(page),
    });
    const cacheKey = `search:${params.toString()}`;
    const cached = this.opts.cache.get<SearchResponse>(cacheKey);
    if (cached) return cached;

    const data = await this.request<SearchResponse>(`${this.opts.baseUrl}/database/search?${params}`, signal);
    this.opts.cache.set(cacheKey, data);
    return data;
  }

  /** Rate-limited GET with retry on 429. */
  private async request<T>(url: string, signal?: AbortSignal): Promise<T> {
    const headers: Record<string, string> = { Accept: 'application/vnd.discogs.v2.discogs+json' };
    if (this.opts.token) headers.Authorization = `Discogs token=${this.opts.token}`;

    for (let attempt = 0; attempt < 3; attempt++) {
      await this.opts.limiter.acquire();
      const res = await this.opts.fetchImpl(url, { headers, signal });
      if (res.status === 429) {
        const header = Number(res.headers.get('Retry-After'));
        const retryAfter = Number.isFinite(header) && res.headers.has('Retry-After') ? header : 60;
        this.opts.limiter.backoff(retryAfter * 1000);
        continue;
      }
      if (!res.ok) throw new Error(`Discogs request failed (${res.status})`);
      return (await res.json()) as T;
    }
    throw new Error('Discogs rate limit reached. Please try again in a minute.');
  }
}
