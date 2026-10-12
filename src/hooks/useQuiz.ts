import { useCallback, useEffect, useReducer, useRef } from 'react';
import { albumSource as source } from '../data/activeSource';
import type { Category, Difficulty } from '../domain/types';
import { CATEGORY_LABELS, filterByCategory } from '../game/categories';
import { ROUNDS_PER_GAME } from '../game/difficulty';
import { buildQuiz } from '../game/questionBuilder';
import { gameReducer, initialState } from '../game/reducer';
import { createRng, randomSeed } from '../game/rng';
import { prepareCrop } from './useCrop';

export function useQuiz() {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const abortRef = useRef<AbortController | null>(null);

  const start = useCallback(async (difficulty: Difficulty, category: Category) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    dispatch({ type: 'LOAD', difficulty, category });
    try {
      const all = await source.getAlbums(controller.signal, category);
      if (controller.signal.aborted) return;
      const albums = filterByCategory(all, category);
      if (albums.length < ROUNDS_PER_GAME) {
        throw new Error(
          `Only ${albums.length} ${CATEGORY_LABELS[category].title} albums available. Pick another genre or All.`,
        );
      }
      const questions = buildQuiz(albums, difficulty, createRng(randomSeed()));
      void prepareCrop(questions[0]);
      dispatch({ type: 'READY', questions });

      // Sources like Discogs only give cover URLs per album. Look them up in round order, in the background.
      if (source.resolveCover) {
        for (const q of questions) {
          if (q.coverStatus !== 'pending') continue;
          try {
            const resolved = await source.resolveCover(q.album, controller.signal);
            if (controller.signal.aborted) return;
            dispatch({ type: 'COVER_RESOLVED', questionId: q.id, coverImageUrl: resolved.coverImageUrl });
          } catch {
            if (controller.signal.aborted) return;
            dispatch({ type: 'COVER_FAILED', questionId: q.id });
          }
        }
      }
    } catch (e) {
      if (controller.signal.aborted) return;
      dispatch({ type: 'LOAD_FAILED', message: e instanceof Error ? e.message : 'Could not load albums.' });
    }
  }, []);

  // Warm up the next round's artwork while the player answers the current one.
  const upcoming = state.phase === 'playing' ? state.questions[state.index + 1] : undefined;
  useEffect(() => {
    if (upcoming) void prepareCrop(upcoming);
  }, [upcoming]);

  return {
    state,
    attribution: source.attribution,
    start,
    setDifficulty: (difficulty: Difficulty) => dispatch({ type: 'SET_DIFFICULTY', difficulty }),
    setCategory: (category: Category) => dispatch({ type: 'SET_CATEGORY', category }),
    answer: (albumId: string) => dispatch({ type: 'ANSWER', albumId }),
    skip: () => dispatch({ type: 'SKIP' }),
    next: () => dispatch({ type: 'NEXT' }),
    reset: () => dispatch({ type: 'RESET' }),
  };
}
