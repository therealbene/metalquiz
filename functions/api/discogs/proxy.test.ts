import { describe, expect, it, vi } from 'vitest';
import { onRequest, onRequestGet } from './[[path]]';

describe('Cloudflare Pages function', () => {
  it('reads the token from env and proxies an allowed request', async () => {
    const upstream = vi.fn(async () => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', upstream);
    const res = await onRequestGet({ request: new Request('http://x/api/discogs/masters/7710'), env: { DISCOGS_TOKEN: 'SECRET' } });
    vi.unstubAllGlobals();
    expect(res.status).toBe(200);
    const init = (upstream.mock.calls[0] as unknown as [string, RequestInit])[1];
    expect((init.headers as Record<string, string>).Authorization).toBe('Discogs token=SECRET');
  });
  it('rejects other methods and unknown paths', async () => {
    expect((await onRequest({ request: new Request('http://x/api/discogs/masters/1', { method: 'POST' }), env: { DISCOGS_TOKEN: 'T' } })).status).toBe(405);
    expect((await onRequestGet({ request: new Request('http://x/api/discogs/users/me'), env: { DISCOGS_TOKEN: 'T' } })).status).toBe(404);
  });
});
