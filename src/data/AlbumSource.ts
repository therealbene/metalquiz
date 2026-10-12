import type { Album, Category } from '../domain/types';

/**
 * Anything that can provide albums for the quiz. The game only depends on this interface,
 * so a Discogs-backed source, a static JSON dump or a mock can be swapped without touching game code.
 */
export interface AlbumSource {
  readonly name: string;
  /**
   * Returns candidate albums. `category` is a hint so remote sources can fetch less; the caller still filters,
   * so a source may return more than was asked for.
   */
  getAlbums(signal?: AbortSignal, category?: Category): Promise<Album[]>;
  /**
   * Some APIs (Discogs) do not return cover URLs in list results. When present, the game calls this for the
   * albums it will actually show, and expects the album back with `coverImageUrl` filled in.
   */
  resolveCover?(album: Album, signal?: AbortSignal): Promise<Album>;
  /** Text shown in the footer, e.g. the attribution Discogs requires. */
  readonly attribution?: { text: string; href: string };
}
