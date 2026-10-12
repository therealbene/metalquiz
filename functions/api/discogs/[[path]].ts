import { handleDiscogsRequest } from '../../../server/discogsProxy';

interface Env {
  /** Set as an encrypted secret in Cloudflare Pages (Settings > Variables and Secrets). */
  DISCOGS_TOKEN?: string;
}

// Cloudflare Pages Function: /api/discogs/database/search and /api/discogs/masters/{id}
export const onRequestGet = ({ request, env }: { request: Request; env: Env }): Promise<Response> =>
  handleDiscogsRequest(request, env.DISCOGS_TOKEN);

// Any other method gets the proxy's own 405 response instead of falling through to the static site.
export const onRequest = ({ request, env }: { request: Request; env: Env }): Promise<Response> =>
  handleDiscogsRequest(request, env.DISCOGS_TOKEN);
