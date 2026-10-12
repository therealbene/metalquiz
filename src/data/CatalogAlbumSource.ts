import type { Album } from '../domain/types';
import type { AlbumSource } from './AlbumSource';
import { parseCatalog } from './catalog';

export interface CatalogOptions {
  /** Where the catalogue lives. Default: albums.json next to the site. */
  url?: string;
  fetchImpl?: typeof fetch;
  /**
   * Used when a stored cover URL stops working: asks the live source for a fresh one.
   * Typically a DiscogsAlbumSource that talks to the proxy.
   */
  refresher?: Pick<AlbumSource, 'resolveCover'>;
}

/**
 * Reads a prebuilt album list (public/albums.json). Picking albums needs no Discogs calls at all, so the quiz is
 * fast and does not use up the API rate limit. Only the cover images are still loaded from Discogs' image host.
 */
export class CatalogAlbumSource implements AlbumSource {
  readonly name = 'catalog';
  readonly attribution = { text: 'Metadata and artwork via Discogs', href: 'https://www.discogs.com' };
  private loading: Promise<Album[]> | null = null;

  constructor(private readonly opts: CatalogOptions = {}) {}

  getAlbums(signal?: AbortSignal): Promise<Album[]> {
    this.loading ??= this.load(signal).catch((e) => {
      this.loading = null; // allow a retry after a failure
      throw e;
    });
    return this.loading;
  }

  private async load(signal?: AbortSignal): Promise<Album[]> {
    const url = this.opts.url ?? `${import.meta.env.BASE_URL}albums.json`;
    const res = await (this.opts.fetchImpl ?? fetch)(url, { signal });
    if (!res.ok) throw new Error(`Could not load the album catalogue (${res.status}).`);
    return parseCatalog(await res.json());
  }

  async resolveCover(album: Album, signal?: AbortSignal): Promise<Album> {
    return this.opts.refresher?.resolveCover ? this.opts.refresher.resolveCover(album, signal) : album;
  }
}
