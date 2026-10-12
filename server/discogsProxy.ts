/**
 * Server-side Discogs proxy. Runs in a Vercel function in production and inside the Vite dev server locally,
 * so the token never reaches the browser.
 *
 * Only two read-only calls are allowed, with sanitised parameters:
 *   GET {base}/database/search?style=...&page=...&per_page=...
 *   GET {base}/masters/{id}
 * Everything else is a 404, so the proxy cannot be used as a general relay for the token.
 */

export const PROXY_PREFIX = '/api/discogs';
const UPSTREAM = 'https://api.discogs.com';
const USER_AGENT = 'MetalCoverQuiz/1.0';

const json = (body: unknown, status: number, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...extra },
  });

function clampInt(value: string | null, fallback: number, min: number, max: number): number {
  const n = Number.parseInt(value ?? '', 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

/** Builds the upstream URL for an allowed request, or null if the request is not allowed. */
export function buildUpstreamUrl(pathname: string, search: URLSearchParams): string | null {
  const path = pathname.startsWith(PROXY_PREFIX) ? pathname.slice(PROXY_PREFIX.length) : pathname;

  if (path === '/database/search') {
    const style = search.get('style') ?? '';
    if (!style || style.length > 40 || !/^[\p{L}\p{N} &'-]+$/u.test(style)) return null;
    const params = new URLSearchParams({
      type: 'master',
      genre: 'Rock',
      style,
      per_page: String(clampInt(search.get('per_page'), 100, 1, 100)),
      page: String(clampInt(search.get('page'), 1, 1, 10)),
    });
    return `${UPSTREAM}/database/search?${params}`;
  }

  const master = /^\/masters\/(\d{1,12})$/.exec(path);
  if (master) return `${UPSTREAM}/masters/${master[1]}`;
  return null;
}

export async function handleDiscogsRequest(
  request: Request,
  token: string | undefined,
  fetchImpl: typeof fetch = fetch,
): Promise<Response> {
  if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405, { Allow: 'GET' });
  if (!token) return json({ error: 'Server is missing DISCOGS_TOKEN' }, 500);

  const url = new URL(request.url);
  const upstream = buildUpstreamUrl(url.pathname, url.searchParams);
  if (!upstream) return json({ error: 'Not found' }, 404);

  let res: Response;
  try {
    res = await fetchImpl(upstream, {
      headers: {
        Authorization: `Discogs token=${token}`,
        'User-Agent': USER_AGENT,
        Accept: 'application/vnd.discogs.v2.discogs+json',
      },
    });
  } catch {
    return json({ error: 'Discogs is unreachable' }, 502);
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (res.status === 429) {
    headers['Retry-After'] = res.headers.get('Retry-After') ?? '60';
    headers['Cache-Control'] = 'no-store';
  } else if (res.ok) {
    // Cached at the CDN for a day: many players share one upstream call, which protects the rate limit.
    headers['Cache-Control'] = 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800';
  } else {
    headers['Cache-Control'] = 'no-store';
  }
  // Pass the body through without ever echoing request headers, so the token cannot leak.
  return new Response(await res.text(), { status: res.status, headers });
}
