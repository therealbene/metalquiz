import { useCallback, useEffect, useReducer, useRef } from 'react';
import { albumSource as source } from '../data/activeSource';
import type { Category, Difficulty, GameMode, Question } from '../domain/types';
import { CATEGORY_LABELS, filterByCategory } from '../game/categories';
import { ROUNDS_PER_GAME } from '../game/difficulty';
import { buildQuiz } from '../game/questionBuilder';
import { loadSeen, rememberSeen } from '../game/seenAlbums';
import { gameReducer, initialState } from '../game/reducer';
import { createRng, randomSeed } from '../game/rng';
import { prepareCrop } from './useCrop';

export function useQuiz() {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const abortRef = useRef<AbortController | null>(null);

  const start = useCallback(async (difficulty: Difficulty, category: Category, mode: GameMode) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    dispatch({ type: 'LOAD', difficulty, category, mode });
    try {
      const all = await source.getAlbums(controller.signal, category);
      if (controller.signal.aborted) return;
      const albums = filterByCategory(all, category);
      if (albums.length < ROUNDS_PER_GAME) {
        throw new Error(
          `Only ${albums.length} ${CATEGORY_LABELS[category].title} albums available. Pick another genre or All.`,
        );
      }
      const questions = buildQuiz(albums, difficulty, createRng(randomSeed()), ROUNDS_PER_GAME, mode, loadSeen());
      rememberSeen(questions.map((q) => q.album.id));
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

  // A stored cover URL may stop working (Discogs image URLs are signed). Ask the source for a fresh one, once.
  const refreshed = useRef(new Set<string>());
  const refreshCover = useCallback(async (q: Question) => {
    if (!source.resolveCover || refreshed.current.has(q.id)) {
      dispatch({ type: 'COVER_FAILED', questionId: q.id });
      return;
    }
    refreshed.current.add(q.id);
    dispatch({ type: 'COVER_REFRESH', questionId: q.id });
    try {
      const fresh = await source.resolveCover({ ...q.album, coverImageUrl: '' });
      if (fresh.coverImageUrl && fresh.coverImageUrl !== q.album.coverImageUrl) {
        dispatch({ type: 'COVER_RESOLVED', questionId: q.id, coverImageUrl: fresh.coverImageUrl });
      } else {
        dispatch({ type: 'COVER_FAILED', questionId: q.id });
      }
    } catch {
      dispatch({ type: 'COVER_FAILED', questionId: q.id });
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
    setMode: (mode: GameMode) => dispatch({ type: 'SET_MODE', mode }),
    setCategory: (category: Category) => dispatch({ type: 'SET_CATEGORY', category }),
    answer: (albumId: string, zoomProgress?: number) => dispatch({ type: 'ANSWER', albumId, zoomProgress }),
    skip: () => dispatch({ type: 'SKIP' }),
    refreshCover,
    next: () => dispatch({ type: 'NEXT' }),
    reset: () => dispatch({ type: 'RESET' }),
  };
}
