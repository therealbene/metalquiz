import type { Category, Difficulty, Question, RoundResult } from '../domain/types';
import { scoreCorrectAnswer } from './scoring';

export type GameState =
  | { phase: 'start'; difficulty: Difficulty; category: Category }
  | { phase: 'loading'; difficulty: Difficulty; category: Category }
  | { phase: 'error'; difficulty: Difficulty; category: Category; message: string }
  | {
      phase: 'playing';
      difficulty: Difficulty;
      category: Category;
      questions: Question[];
      index: number;
      /** Chosen album id once the player answered this round. */
      chosenAlbumId: string | null;
      /** Set when the player has answered or skipped. */
      answered: boolean;
      score: number;
      streak: number;
      bestStreak: number;
      /** Points awarded in the current round, for the score-up animation. */
      lastAward: number;
      results: RoundResult[];
    }
  | {
      phase: 'results';
      difficulty: Difficulty;
      category: Category;
      questions: Question[];
      score: number;
      bestStreak: number;
      results: RoundResult[];
    };

export type GameAction =
  | { type: 'SET_DIFFICULTY'; difficulty: Difficulty }
  | { type: 'SET_CATEGORY'; category: Category }
  | { type: 'LOAD'; difficulty: Difficulty; category: Category }
  | { type: 'LOAD_FAILED'; message: string }
  | { type: 'READY'; questions: Question[] }
  | { type: 'COVER_RESOLVED'; questionId: string; coverImageUrl: string }
  | { type: 'COVER_FAILED'; questionId: string }
  | { type: 'ANSWER'; albumId: string }
  | { type: 'SKIP' }
  | { type: 'NEXT' }
  | { type: 'RESET' };

export const initialState: GameState = { phase: 'start', difficulty: 'normal', category: 'all' };

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SET_DIFFICULTY':
      return state.phase === 'start' ? { ...state, difficulty: action.difficulty } : state;

    case 'SET_CATEGORY':
      return state.phase === 'start' ? { ...state, category: action.category } : state;

    case 'LOAD':
      return { phase: 'loading', difficulty: action.difficulty, category: action.category };

    case 'LOAD_FAILED':
      return state.phase === 'loading'
        ? { phase: 'error', difficulty: state.difficulty, category: state.category, message: action.message }
        : state;

    case 'READY':
      if (state.phase !== 'loading') return state;
      return {
        phase: 'playing',
        difficulty: state.difficulty,
        category: state.category,
        questions: action.questions,
        index: 0,
        chosenAlbumId: null,
        answered: false,
        score: 0,
        streak: 0,
        bestStreak: 0,
        lastAward: 0,
        results: [],
      };

    case 'COVER_RESOLVED':
    case 'COVER_FAILED': {
      if (state.phase !== 'playing') return state;
      const ok = action.type === 'COVER_RESOLVED';
      return {
        ...state,
        questions: state.questions.map((q) =>
          q.id !== action.questionId
            ? q
            : {
                ...q,
                coverStatus: ok ? 'ready' : 'failed',
                album: ok ? { ...q.album, coverImageUrl: action.coverImageUrl } : q.album,
              },
        ),
      };
    }

    case 'ANSWER': {
      if (state.phase !== 'playing' || state.answered) return state;
      const q = state.questions[state.index];
      const correct = action.albumId === q.album.id;
      const streak = correct ? state.streak + 1 : 0;
      const points = correct
        ? scoreCorrectAnswer({ album: q.album, round: q.round, streak, difficulty: state.difficulty }).total
        : 0;
      return {
        ...state,
        answered: true,
        chosenAlbumId: action.albumId,
        streak,
        bestStreak: Math.max(state.bestStreak, streak),
        score: state.score + points,
        lastAward: points,
        results: [
          ...state.results,
          { round: q.round, albumId: q.album.id, chosenAlbumId: action.albumId, correct, skipped: false, points },
        ],
      };
    }

    case 'SKIP': {
      // Used when the artwork cannot be loaded. Not the player's fault, so the streak is kept
      // and the round is excluded from accuracy.
      if (state.phase !== 'playing' || state.answered) return state;
      const q = state.questions[state.index];
      return {
        ...state,
        answered: true,
        lastAward: 0,
        results: [
          ...state.results,
          { round: q.round, albumId: q.album.id, chosenAlbumId: null, correct: false, skipped: true, points: 0 },
        ],
      };
    }

    case 'NEXT': {
      if (state.phase !== 'playing' || !state.answered) return state;
      if (state.index + 1 >= state.questions.length) {
        return {
          phase: 'results',
          difficulty: state.difficulty,
          category: state.category,
          questions: state.questions,
          score: state.score,
          bestStreak: state.bestStreak,
          results: state.results,
        };
      }
      return { ...state, index: state.index + 1, chosenAlbumId: null, answered: false, lastAward: 0 };
    }

    case 'RESET':
      return { phase: 'start', difficulty: state.difficulty, category: state.category };
  }
}

export function summarize(results: RoundResult[]) {
  const played = results.filter((r) => !r.skipped);
  const correct = played.filter((r) => r.correct).length;
  return {
    correct,
    total: played.length,
    accuracy: played.length === 0 ? 0 : Math.round((correct / played.length) * 100),
  };
}
