import type { Album, Difficulty } from '../domain/types';
import { MODE_CONFIG } from './difficulty';

export type RecognitionTier = 'easy' | 'medium' | 'hard';

export const TIER_POINTS: Record<RecognitionTier, number> = { easy: 100, medium: 200, hard: 300 };
const ROUND_BONUS_PER_ROUND = 10;
const STREAK_BONUS_PER_STEP = 25;
const MAX_STREAK_STEPS = 5;

export function recognitionTier(album: Pick<Album, 'difficultyScore'>): RecognitionTier {
  if (album.difficultyScore < 34) return 'easy';
  if (album.difficultyScore < 67) return 'medium';
  return 'hard';
}

export interface PointsBreakdown {
  base: number;
  roundBonus: number;
  streakBonus: number;
  total: number;
}

/**
 * Points for one correct answer.
 * - base depends on how hard the album is to recognise (100 / 200 / 300)
 * - later rounds add a small bonus
 * - each consecutive correct answer before this one adds a streak bonus (capped)
 * - the sum is scaled by the chosen difficulty mode
 */
export function scoreCorrectAnswer(args: {
  album: Pick<Album, 'difficultyScore'>;
  round: number;
  /** Streak length after this answer (1 for the first correct answer in a row). */
  streak: number;
  difficulty: Difficulty;
}): PointsBreakdown {
  const base = TIER_POINTS[recognitionTier(args.album)];
  const roundBonus = (args.round - 1) * ROUND_BONUS_PER_ROUND;
  const streakBonus = Math.min(Math.max(args.streak - 1, 0), MAX_STREAK_STEPS) * STREAK_BONUS_PER_STEP;
  const mult = MODE_CONFIG[args.difficulty].scoreMultiplier;
  const scale = (n: number) => Math.round(n * mult);
  return {
    base: scale(base),
    roundBonus: scale(roundBonus),
    streakBonus: scale(streakBonus),
    total: scale(base + roundBonus + streakBonus),
  };
}
