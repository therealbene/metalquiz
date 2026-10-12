import { handleDiscogsRequest } from '../../server/discogsProxy';

// Vercel function: /api/discogs/database/search and /api/discogs/masters/{id}
export function GET(request: Request): Promise<Response> {
  return handleDiscogsRequest(request, process.env.DISCOGS_TOKEN);
}
