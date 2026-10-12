import { describe, expect, it, vi } from 'vitest';
import worker from './index';

describe('Cloudflare Worker', () => {
  it('proxies with the runtime secret', async () => {
    const upstream = vi.fn(async () => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', upstream);
    const res = await worker.fetch(new Request('http://x/api/discogs/masters/7710'), { DISCOGS_TOKEN: 'SECRET' });
    vi.unstubAllGlobals();
    expect(res.status).toBe(200);
    const init = (upstream.mock.calls[0] as unknown as [string, RequestInit])[1];
    expect((init.headers as Record<string, string>).Authorization).toBe('Discogs token=SECRET');
  });
  it('rejects unknown paths and reports a missing secret', async () => {
    expect((await worker.fetch(new Request('http://x/api/discogs/users/me'), { DISCOGS_TOKEN: 'T' })).status).toBe(404);
    expect((await worker.fetch(new Request('http://x/api/discogs/masters/1'), {})).status).toBe(500);
  });
});
