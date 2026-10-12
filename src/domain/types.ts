/** Normalised rectangle (0..1) in image space. */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Album {
  id: string;
  artist: string;
  albumTitle: string;
  year: number;
  genre: string;
  subgenre: string;
  coverImageUrl: string;
  discogsUrl: string;
  /** 0 (unknown) to 100 (everyone knows it). */
  popularityScore: number;
  /** 0 (trivial to recognise) to 100 (very hard). Drives which round an album appears in. */
  difficultyScore: number;
  /** Id in the originating source (e.g. Discogs master id), used to resolve the cover lazily. */
  sourceId?: string;
  /** Optional coarse art style tag, used to pick visually similar distractors. */
  visualStyle?: string;
  /** Optional regions known to contain logos or titles; the crop picker avoids them. */
  avoidRegions?: Rect[];
}

export type Difficulty = 'easy' | 'normal' | 'hard';

/** classic: fixed fragment. zoom: the crop zooms out over time, answering early pays more. */
export type GameMode = 'classic' | 'zoom';

export type Category = 'all' | 'heavy' | 'thrash' | 'death' | 'black' | 'doom' | 'sludge' | 'grind';

export interface Answer {
  /** Album id this answer stands for. */
  albumId: string;
  label: string;
  artist: string;
  albumTitle: string;
}

export interface Question {
  id: string;
  round: number;
  album: Album;
  answers: Answer[];
  /** 'pending' while the source still has to look up the cover URL; 'failed' if that did not work. */
  coverStatus: 'pending' | 'ready' | 'failed';
  /** Fraction (0..1) of the artwork side that the visible crop covers (in zoom mode: at the start). */
  cropSize: number;
  /** Zoom mode only: time in ms until the whole cover is visible. */
  zoomDurationMs?: number;
  /** Seed so the crop is stable across re-renders. */
  cropSeed: number;
}

export interface RoundResult {
  round: number;
  albumId: string;
  chosenAlbumId: string | null;
  correct: boolean;
  skipped: boolean;
  points: number;
  /** Zoom mode only: how far the zoom had progressed when answering (0 = start, 1 = full cover). */
  zoomProgress?: number;
  /** Milliseconds from seeing the artwork to answering. */
  timeMs?: number;
}
