import { describe, expect, it, vi } from 'vitest';
import { DiscogsAlbumSource } from './DiscogsAlbumSource';
import { MemoryCache } from './discogs/cache';
import { mapDiscogsResults, splitTitle, stylesFor, type DiscogsSearchResult } from './discogs/mapper';
import { RateLimiter } from './discogs/rateLimiter';
import { buildMockCatalog } from './mockCatalog';
import { createAlbumSource } from './createAlbumSource';

const result = (id: number, over: Partial<DiscogsSearchResult> = {}): DiscogsSearchResult => ({
  id,
  title: `Band ${id} (2) - Record ${id}`,
  year: '1986',
  style: ['Thrash', 'Heavy Metal'],
  cover_image: `https://i.discogs.com/${id}.jpg`,
  uri: `/master/${id}-x`,
  community: { have: id * 100, want: 5 },
  ...over,
});

describe('mock catalogue', () => {

  const albums = buildMockCatalog();
  it('is large enough, has unique ids and complete fields', () => {
    expect(albums.length).toBeGreaterThanOrEqual(80);
    expect(new Set(albums.map((a) => a.id)).size).toBe(albums.length);
    for (const a of albums) {
      expect(a.coverImageUrl.startsWith('data:image/svg+xml')).toBe(true);
      expect(a.discogsUrl).toMatch(/^https:\/\/www\.discogs\.com/);
      expect(a.difficultyScore).toBeGreaterThanOrEqual(0);
      expect(a.difficultyScore).toBeLessThanOrEqual(100);
    }
  });
});

describe('discogs mapper', () => {
  it('splits artist and title and strips disambiguation numbers', () => {
    expect(splitTitle('Slayer (3) - Reign In Blood')).toEqual({ artist: 'Slayer', albumTitle: 'Reign In Blood' });
    expect(splitTitle('no separator')).toBeNull();
  });
  it('keeps albums without images (covers are resolved later) and drops duplicates and bad rows', () => {
    const albums = mapDiscogsResults([
      result(1, { cover_image: '' }),
      result(2, { cover_image: 'https://st.discogs.com/spacer.gif' }),
      result(3),
      result(1, { id: 99 }),
      result(4, { year: '0' }),
      result(5, { title: 'no separator' }),
    ]);
    expect(albums.map((a) => a.id)).toEqual(['discogs-1', 'discogs-2', 'discogs-3']);
    expect(albums.map((a) => a.coverImageUrl)).toEqual(['', '', 'https://i.discogs.com/3.jpg']);
    expect(albums[0].sourceId).toBe('1');
  });
  it('keeps only album formats', () => {
    const albums = mapDiscogsResults([
      result(1, { format: ['Vinyl', 'LP', 'Album'] }),
      result(2, { format: ['CD', 'Single'] }),
      result(3, { format: ['CD', 'Album', 'Compilation'] }),
      result(4, { format: ['Vinyl', 'EP'] }),
    ]);
    expect(albums.map((a) => a.id)).toEqual(['discogs-1']);
  });
  it('prefers master_id as the album id', () => {
    expect(mapDiscogsResults([result(7, { master_id: 700 })])[0].id).toBe('discogs-700');
  });
  it('derives popularity from owners and difficulty as its inverse', () => {
    const [low, high] = mapDiscogsResults([result(1), result(50)]);
    expect(high.popularityScore).toBe(100);
    expect(low.popularityScore).toBeLessThan(high.popularityScore);
    expect(low.difficultyScore).toBe(100 - low.popularityScore);
    expect(low.subgenre).toBe('Thrash');
    expect(low.discogsUrl).toBe('https://www.discogs.com/master/1-x');
  });
});

describe('discogs styles per category', () => {
  it('only queries relevant styles for a genre', () => {
    expect(stylesFor('death')).toEqual(['Death Metal', 'Grindcore']);
    expect(stylesFor('thrash')).toEqual(['Thrash', 'Groove Metal']);
    expect(stylesFor('all').length).toBeGreaterThan(10);
  });
});

describe('rate limiter', () => {
  it('spaces requests by the minimum interval', async () => {
    let now = 0;
    const waits: number[] = [];
    const limiter = new RateLimiter(1000, () => now, async (ms) => { waits.push(ms); now += ms; });
    await limiter.acquire();
    await limiter.acquire();
    await limiter.acquire();
    expect(waits).toEqual([1000, 1000]);
  });
});

describe('DiscogsAlbumSource', () => {

  it('sends the token, caches pages and stops once it has enough albums', async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ results: [result(1), result(2), result(3)] }), { status: 200 }),
    );
    const cache = new MemoryCache();
    const mk = () => new DiscogsAlbumSource({ token: 'T', minAlbums: 3, fetchImpl, cache, limiter: new RateLimiter(0) });
    const albums = await mk().getAlbums();
    expect(albums).toHaveLength(3);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const headers = (fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1].headers as Record<string, string>;
    expect(headers.Authorization).toBe('Discogs token=T');
    await mk().getAlbums();
    expect(fetchImpl).toHaveBeenCalledTimes(1); // served from cache
  });

  it('resolves a cover from the master endpoint, preferring the primary image, and memoises it', async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ images: [{ type: 'secondary', uri: 'https://i/b.jpg' }, { type: 'primary', uri: 'https://i/a.jpg' }] }), { status: 200 }),
    );
    const src = new DiscogsAlbumSource({ token: 'T', fetchImpl, cache: new MemoryCache(), limiter: new RateLimiter(0) });
    const album = mapDiscogsResults([result(1, { cover_image: '' })])[0];
    expect((await src.resolveCover(album)).coverImageUrl).toBe('https://i/a.jpg');
    await src.resolveCover(album);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect((fetchImpl.mock.calls[0] as unknown as [string])[0]).toBe('https://api.discogs.com/masters/1');
  });

  it('fails resolveCover when the master has no images', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({}), { status: 200 }));
    const src = new DiscogsAlbumSource({ fetchImpl, cache: new MemoryCache(), limiter: new RateLimiter(0) });
    await expect(src.resolveCover(mapDiscogsResults([result(1, { cover_image: '' })])[0])).rejects.toThrow(/No cover/);
  });

  it('retries after a 429', async () => {
    let calls = 0;
    const fetchImpl = vi.fn(async () =>
      ++calls === 1
        ? new Response('', { status: 429, headers: { 'Retry-After': '0' } })
        : new Response(JSON.stringify({ results: [result(1)] }), { status: 200 }),
    );
    const albums = await new DiscogsAlbumSource({ minAlbums: 1, fetchImpl, cache: new MemoryCache(), limiter: new RateLimiter(0) }).getAlbums();
    expect(albums).toHaveLength(1);
    expect(calls).toBe(2);
  });

  it('surfaces HTTP errors', async () => {
    const fetchImpl = vi.fn(async () => new Response('', { status: 401 }));
    await expect(
      new DiscogsAlbumSource({ fetchImpl, cache: new MemoryCache(), limiter: new RateLimiter(0) }).getAlbums(),
    ).rejects.toThrow(/401/);
  });
});

describe('createAlbumSource', () => {
  it('defaults to mock and switches to discogs via env', () => {
    expect(createAlbumSource({}).name).toBe('mock');
    expect(createAlbumSource({ VITE_ALBUM_SOURCE: 'discogs' }).name).toBe('discogs');
  });
});
