import { describe, expect, it, vi } from 'vitest';
import { buildUpstreamUrl, handleDiscogsRequest } from './discogsProxy';

const req = (path: string, method = 'GET') => new Request(`http://localhost${path}`, { method });
const ok = () => vi.fn(async () => new Response('{"results":[]}', { status: 200 }));

describe('buildUpstreamUrl', () => {
  it('forces safe search parameters and clamps paging', () => {
    const u = new URL(
      buildUpstreamUrl('/api/discogs/database/search', new URLSearchParams('style=Death+Metal&per_page=9999&page=-4&type=release&genre=Pop&token=x'))!,
    );
    expect(u.origin + u.pathname).toBe('https://api.discogs.com/database/search');
    expect(Object.fromEntries(u.searchParams)).toEqual({
      type: 'master', genre: 'Rock', style: 'Death Metal', per_page: '100', page: '1',
    });
  });
  it('allows only numeric master ids', () => {
    expect(buildUpstreamUrl('/api/discogs/masters/7710', new URLSearchParams())).toBe('https://api.discogs.com/masters/7710');
    expect(buildUpstreamUrl('/api/discogs/masters/7710/versions', new URLSearchParams())).toBeNull();
    expect(buildUpstreamUrl('/api/discogs/masters/abc', new URLSearchParams())).toBeNull();
    expect(buildUpstreamUrl('/api/discogs/masters/..%2Fusers', new URLSearchParams())).toBeNull();
  });
  it('rejects everything else', () => {
    for (const p of ['/api/discogs/oauth/identity', '/api/discogs/users/x/collection', '/api/discogs/', '/api/discogs/database/search/../x']) {
      expect(buildUpstreamUrl(p, new URLSearchParams('style=Thrash'))).toBeNull();
    }
    expect(buildUpstreamUrl('/api/discogs/database/search', new URLSearchParams())).toBeNull();
    expect(buildUpstreamUrl('/api/discogs/database/search', new URLSearchParams('style=a%0d%0ab'))).toBeNull();
  });
});

describe('handleDiscogsRequest', () => {
  it('adds the token upstream and never exposes it to the client', async () => {
    const fetchImpl = ok();
    const res = await handleDiscogsRequest(req('/api/discogs/database/search?style=Thrash'), 'SECRET', fetchImpl);
    expect(res.status).toBe(200);
    const init = (fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1];
    expect((init.headers as Record<string, string>).Authorization).toBe('Discogs token=SECRET');
    expect(JSON.stringify([...res.headers])).not.toContain('SECRET');
    expect(await res.text()).not.toContain('SECRET');
    expect(res.headers.get('Cache-Control')).toContain('s-maxage');
  });
  it('ignores a client-supplied Authorization header', async () => {
    const fetchImpl = ok();
    await handleDiscogsRequest(
      new Request('http://localhost/api/discogs/masters/1', { headers: { Authorization: 'Discogs token=EVIL' } }),
      'SECRET',
      fetchImpl,
    );
    const init = (fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1];
    expect((init.headers as Record<string, string>).Authorization).toBe('Discogs token=SECRET');
  });
  it('404s unknown paths without calling Discogs, and refuses non-GET', async () => {
    const fetchImpl = ok();
    expect((await handleDiscogsRequest(req('/api/discogs/users/me'), 'T', fetchImpl)).status).toBe(404);
    expect((await handleDiscogsRequest(req('/api/discogs/masters/1', 'POST'), 'T', fetchImpl)).status).toBe(405);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
  it('reports a missing token and upstream failures', async () => {
    expect((await handleDiscogsRequest(req('/api/discogs/masters/1'), undefined, ok())).status).toBe(500);
    const down = vi.fn(async () => { throw new Error('x'); });
    expect((await handleDiscogsRequest(req('/api/discogs/masters/1'), 'T', down)).status).toBe(502);
  });
  it('passes 429 through with Retry-After and does not cache it', async () => {
    const limited = vi.fn(async () => new Response('', { status: 429, headers: { 'Retry-After': '30' } }));
    const res = await handleDiscogsRequest(req('/api/discogs/masters/1'), 'T', limited);
    expect([res.status, res.headers.get('Retry-After'), res.headers.get('Cache-Control')]).toEqual([429, '30', 'no-store']);
  });
});
