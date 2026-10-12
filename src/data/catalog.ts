import type { Album } from '../domain/types';

export const CATALOG_VERSION = 1;

/** Shape of public/albums.json, written by scripts/build-catalog.ts. */
export interface CatalogFile {
  version: number;
  generatedAt: string;
  source: string;
  albums: Album[];
}

const isAlbum = (x: unknown): x is Album => {
  if (!x || typeof x !== 'object') return false;
  const a = x as Record<string, unknown>;
  return (
    typeof a.id === 'string' &&
    typeof a.artist === 'string' &&
    typeof a.albumTitle === 'string' &&
    typeof a.year === 'number' &&
    typeof a.subgenre === 'string' &&
    typeof a.coverImageUrl === 'string' &&
    typeof a.popularityScore === 'number' &&
    typeof a.difficultyScore === 'number'
  );
};

/** Validates the downloaded file and drops malformed entries instead of crashing the game. */
export function parseCatalog(json: unknown): Album[] {
  const file = json as Partial<CatalogFile> | null;
  if (!file || file.version !== CATALOG_VERSION || !Array.isArray(file.albums)) {
    throw new Error('The album catalogue has an unsupported format.');
  }
  const albums = file.albums.filter(isAlbum);
  if (albums.length === 0) throw new Error('The album catalogue is empty.');
  return albums;
}
