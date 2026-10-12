import type { Album } from '../domain/types';
import type { AlbumSource } from './AlbumSource';
import { buildMockCatalog } from './mockCatalog';

export class MockAlbumSource implements AlbumSource {
  readonly name = 'mock';
  readonly attribution = undefined;
  private cache: Album[] | null = null;

  async getAlbums(): Promise<Album[]> {
    this.cache ??= buildMockCatalog();
    return this.cache;
  }
}
