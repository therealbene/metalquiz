import type { Difficulty } from '../domain/types';

export const ROUNDS_PER_GAME = 10;

export interface RoundProfile {
  /** Fraction of the artwork side visible in the crop. */
  cropSize: number;
  /** Which album difficultyScore we aim for in this round. */
  targetAlbumDifficulty: number;
  /** 0 = wrong answers are random, 1 = wrong answers are as similar as possible. */
  distractorSimilarity: number;
}

interface Range {
  from: number;
  to: number;
}

interface ModeConfig {
  cropSize: Range;
  targetAlbumDifficulty: Range;
  distractorSimilarity: Range;
  /** Multiplier applied to points. */
  scoreMultiplier: number;
}

export const MODE_CONFIG: Record<Difficulty, ModeConfig> = {
  easy: {
    cropSize: { from: 0.55, to: 0.4 },
    targetAlbumDifficulty: { from: 5, to: 45 },
    distractorSimilarity: { from: 0.05, to: 0.45 },
    scoreMultiplier: 1,
  },
  normal: {
    cropSize: { from: 0.42, to: 0.22 },
    targetAlbumDifficulty: { from: 10, to: 70 },
    distractorSimilarity: { from: 0.2, to: 0.8 },
    scoreMultiplier: 1.25,
  },
  hard: {
    cropSize: { from: 0.3, to: 0.14 },
    targetAlbumDifficulty: { from: 35, to: 95 },
    distractorSimilarity: { from: 0.55, to: 1 },
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
): RoundProfile {
  const cfg = MODE_CONFIG[difficulty];
  const t = roundProgress(round, totalRounds);
  return {
    cropSize: lerp(cfg.cropSize, t),
    targetAlbumDifficulty: lerp(cfg.targetAlbumDifficulty, t),
    distractorSimilarity: lerp(cfg.distractorSimilarity, t),
  };
}
