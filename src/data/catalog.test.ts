import { describe, expect, it, vi } from 'vitest';
import { CatalogAlbumSource } from './CatalogAlbumSource';
import { parseCatalog } from './catalog';
import { createAlbumSource } from './createAlbumSource';
import type { Album } from '../domain/types';

const album = (n: number, over: Partial<Album> = {}): Album => ({
  id: `discogs-${n}`, sourceId: String(n), artist: `Band ${n}`, albumTitle: `Album ${n}`, year: 1990, genre: 'Metal',
  subgenre: 'Thrash', coverImageUrl: `https://i.discogs.com/${n}.jpg`, discogsUrl: `https://www.discogs.com/master/${n}`,
  popularityScore: 50, difficultyScore: 50, ...over,
});
const file = (albums: unknown[], version = 1) => ({ version, generatedAt: '2026-01-01', source: 'discogs', albums });
const respond = (body: unknown, status = 200) => vi.fn(async () => new Response(JSON.stringify(body), { status }));

describe('parseCatalog', () => {
  it('returns valid albums and drops malformed entries', () => {
    const albums = parseCatalog(file([album(1), { id: 'x' }, null, album(2)]));
    expect(albums.map((a) => a.id)).toEqual(['discogs-1', 'discogs-2']);
  });
  it('rejects unsupported versions, wrong shapes and empty catalogues', () => {
    expect(() => parseCatalog(file([album(1)], 2))).toThrow(/unsupported/);
    expect(() => parseCatalog({})).toThrow(/unsupported/);
    expect(() => parseCatalog(null)).toThrow(/unsupported/);
    expect(() => parseCatalog(file([{ nope: true }]))).toThrow(/empty/);
  });
});

describe('CatalogAlbumSource', () => {
  it('loads the file once and shares it between callers', async () => {
    const fetchImpl = respond(file([album(1), album(2)]));
    const src = new CatalogAlbumSource({ url: '/albums.json', fetchImpl: fetchImpl as unknown as typeof fetch });
    const [a, b] = await Promise.all([src.getAlbums(), src.getAlbums()]);
    expect(a).toHaveLength(2);
    expect(b).toBe(a);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect((fetchImpl.mock.calls[0] as unknown as [string])[0]).toBe('/albums.json');
  });
  it('can retry after a failed load', async () => {
    let n = 0;
    const fetchImpl = vi.fn(async () => (++n === 1 ? new Response('', { status: 500 }) : new Response(JSON.stringify(file([album(1)])))));
    const src = new CatalogAlbumSource({ fetchImpl: fetchImpl as unknown as typeof fetch });
    await expect(src.getAlbums()).rejects.toThrow(/500/);
    expect(await src.getAlbums()).toHaveLength(1);
  });
  it('asks the refresher for a fresh cover, or returns the album unchanged without one', async () => {
    const fresh = album(1, { coverImageUrl: 'https://i.discogs.com/new.jpg' });
    const refresher = { resolveCover: vi.fn(async () => fresh) };
    expect(await new CatalogAlbumSource({ refresher }).resolveCover(album(1))).toBe(fresh);
    const a = album(2);
    expect(await new CatalogAlbumSource().resolveCover(a)).toBe(a);
  });
  it('is chosen through env and defaults to mock', () => {
    expect(createAlbumSource({ VITE_ALBUM_SOURCE: 'catalog' }).name).toBe('catalog');
    expect(createAlbumSource({}).name).toBe('mock');
  });
});
