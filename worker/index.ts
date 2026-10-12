import { handleDiscogsRequest } from '../server/discogsProxy';

interface Env {
  /** Runtime secret: Cloudflare dashboard > Worker > Settings > Variables and Secrets. */
  DISCOGS_TOKEN?: string;
}

/**
 * Cloudflare Worker. `run_worker_first` in wrangler.jsonc sends only /api/discogs/* here;
 * every other request is answered straight from the static files in dist/.
 */
export default {
  fetch: (request: Request, env: Env): Promise<Response> => handleDiscogsRequest(request, env.DISCOGS_TOKEN),
};
