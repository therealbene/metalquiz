import type { Album } from '../domain/types';
import type { AlbumSource } from './AlbumSource';
import { buildMockCatalog } from './mockCatalog';

export class MockAlbumSource implements AlbumSource {
  readonly name = 'mock';
  readonly attribution = undefined;
  private cache: Album[] | null = null;

  async getRandomAlbum(): Promise<Album> {
    const albums = await this.getAlbums();
    return albums[Math.floor(Math.random() * albums.length)];
  }

  async getAlbums(): Promise<Album[]> {
    this.cache ??= buildMockCatalog();
    return this.cache;
  }
}
