import type { Difficulty, GameMode } from '../domain/types';

export const ROUNDS_PER_GAME = 10;

export interface RoundProfile {
  /** Fraction of the artwork side visible in the crop. */
  cropSize: number;
  /** Which album difficultyScore we aim for in this round. */
  targetAlbumDifficulty: number;
  /** 0 = wrong answers are random, 1 = wrong answers are as similar as possible. */
  distractorSimilarity: number;
  /** Zoom mode only. */
  zoomDurationMs?: number;
}

interface Range {
  from: number;
  to: number;
}

interface ModeConfig {
  cropSize: Range;
  targetAlbumDifficulty: Range;
  distractorSimilarity: Range;
  /** Zoom mode: crop size at the start of the zoom. */
  zoomStartSize: Range;
  /** Zoom mode: seconds until the whole cover is visible. */
  zoomSeconds: Range;
  /** Multiplier applied to points. */
  scoreMultiplier: number;
}

export const MODE_CONFIG: Record<Difficulty, ModeConfig> = {
  easy: {
    cropSize: { from: 0.55, to: 0.4 },
    targetAlbumDifficulty: { from: 5, to: 45 },
    distractorSimilarity: { from: 0.05, to: 0.45 },
    zoomStartSize: { from: 0.26, to: 0.18 },
    zoomSeconds: { from: 16, to: 12 },
    scoreMultiplier: 1,
  },
  normal: {
    cropSize: { from: 0.42, to: 0.22 },
    targetAlbumDifficulty: { from: 10, to: 70 },
    distractorSimilarity: { from: 0.2, to: 0.8 },
    zoomStartSize: { from: 0.2, to: 0.12 },
    zoomSeconds: { from: 13, to: 9 },
    scoreMultiplier: 1.25,
  },
  hard: {
    cropSize: { from: 0.3, to: 0.14 },
    targetAlbumDifficulty: { from: 35, to: 95 },
    distractorSimilarity: { from: 0.55, to: 1 },
    zoomStartSize: { from: 0.14, to: 0.08 },
    zoomSeconds: { from: 10, to: 7 },
    scoreMultiplier: 1.5,
  },
};

export const DIFFICULTY_LABELS: Record<Difficulty, { label: string; hint: string }> = {
  easy: { label: 'Easy', hint: 'Big crops, famous covers' },
  normal: { label: 'Normal', hint: 'Smaller crops, similar choices' },
  hard: { label: 'Hard', hint: 'Tiny details, deep cuts' },
};

const lerp = ({ from, to }: Range, t: number) => from + (to - from) * t;

/** Progress through the game, 0 in the first round and 1 in the last. */
export function roundProgress(round: number, totalRounds = ROUNDS_PER_GAME): number {
  if (totalRounds <= 1) return 0;
  return Math.min(1, Math.max(0, (round - 1) / (totalRounds - 1)));
}

export function getRoundProfile(
  difficulty: Difficulty,
  round: number,
  totalRounds = ROUNDS_PER_GAME,
  mode: GameMode = 'classic',
): RoundProfile {
  const cfg = MODE_CONFIG[difficulty];
  const t = roundProgress(round, totalRounds);
  const zoom = mode === 'zoom';
  return {
    cropSize: lerp(zoom ? cfg.zoomStartSize : cfg.cropSize, t),
    zoomDurationMs: zoom ? Math.round(lerp(cfg.zoomSeconds, t) * 1000) : undefined,
    targetAlbumDifficulty: lerp(cfg.targetAlbumDifficulty, t),
    distractorSimilarity: lerp(cfg.distractorSimilarity, t),
  };
}

export const MODE_LABELS: Record<GameMode, { label: string; hint: string }> = {
  classic: { label: 'Classic', hint: 'A fixed fragment of the cover' },
  zoom: { label: 'Zoom', hint: 'The cover zooms out. Answer early for more points' },
};
