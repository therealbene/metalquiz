import type { AlbumSource } from './AlbumSource';
import { DiscogsAlbumSource } from './DiscogsAlbumSource';
import { MockAlbumSource } from './MockAlbumSource';

/**
 * Chooses the album source from env vars:
 *   VITE_ALBUM_SOURCE=discogs   use Discogs (default: mock)
 *   VITE_DISCOGS_TOKEN=...      personal access token
 *   VITE_DISCOGS_BASE_URL=...   optional proxy URL
 */
export function createAlbumSource(env: Record<string, string | undefined> = import.meta.env): AlbumSource {
  if (env.VITE_ALBUM_SOURCE === 'discogs') {
    return new DiscogsAlbumSource({
      token: env.VITE_DISCOGS_TOKEN,
      baseUrl: env.VITE_DISCOGS_BASE_URL || undefined,
    });
  }
  return new MockAlbumSource();
}
