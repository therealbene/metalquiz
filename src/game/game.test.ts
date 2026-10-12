import { describe, expect, it } from 'vitest';
import { buildMockCatalog } from '../data/mockCatalog';
import type { Album } from '../domain/types';
import { CATEGORIES, categoryOf, filterByCategory } from './categories';
import { cropToBackground, pickCrop, windowStats, type LumaGrid } from './crop';
import { getRoundProfile } from './difficulty';
import { buildQuiz, similarity } from './questionBuilder';
import { getRank } from './ranks';
import { gameReducer, initialState, summarize, type GameState } from './reducer';
import { SKIPPED_LINE, verdictLine } from './copy';
import { formatTime } from './format';
import { createRng } from './rng';
import { ZOOM_BONUS_ENDS_AT, zoomBonusLeft, zoomTimeFactor, zoomWindow } from './zoom';
import { recognitionTier, scoreCorrectAnswer } from './scoring';

const catalog = buildMockCatalog();

describe('difficulty progression', () => {
  it('shrinks the crop and raises similarity every round in every mode', () => {
    for (const mode of ['easy', 'normal', 'hard'] as const) {
      const first = getRoundProfile(mode, 1);
      const last = getRoundProfile(mode, 10);
      expect(last.cropSize).toBeLessThan(first.cropSize);
      expect(last.distractorSimilarity).toBeGreaterThan(first.distractorSimilarity);
      expect(last.targetAlbumDifficulty).toBeGreaterThan(first.targetAlbumDifficulty);
    }
  });
  it('hard is harder than easy at the same round', () => {
    expect(getRoundProfile('hard', 5).cropSize).toBeLessThan(getRoundProfile('easy', 5).cropSize);
  });
});

describe('scoring', () => {
  const mk = (difficultyScore: number) => ({ difficultyScore });
  it('maps album difficulty to 100/200/300 base points', () => {
    expect(scoreCorrectAnswer({ album: mk(10), round: 1, streak: 1, difficulty: 'easy' }).total).toBe(100);
    expect(recognitionTier(mk(50))).toBe('medium');
    expect(scoreCorrectAnswer({ album: mk(90), round: 1, streak: 1, difficulty: 'easy' }).total).toBe(300);
  });
  it('adds round and streak bonuses and scales by mode', () => {
    const p = scoreCorrectAnswer({ album: mk(50), round: 4, streak: 3, difficulty: 'hard' });
    expect(p.total).toBe(Math.round((200 + 30 + 50) * 1.5));
  });
  it('caps the streak bonus', () => {
    const a = scoreCorrectAnswer({ album: mk(50), round: 1, streak: 6, difficulty: 'easy' }).streakBonus;
    const b = scoreCorrectAnswer({ album: mk(50), round: 1, streak: 10, difficulty: 'easy' }).streakBonus;
    expect(a).toBe(b);
  });
});

describe('ranks', () => {
  it.each([
    [0, 'Poser'], [2, 'Poser'], [3, 'Headbanger'], [4, 'Headbanger'], [5, 'Metalhead'], [6, 'Metalhead'],
    [7, 'True Metal Maniac'], [8, 'True Metal Maniac'], [9, 'Metal Master'], [10, 'Metal God'],
  ])('%i correct is %s', (n, title) => expect(getRank(n).title).toBe(title));
});

describe('crop', () => {
  it('stays inside the image and is deterministic for a seed', () => {
    for (let s = 0; s < 50; s++) {
      const c = pickCrop({ size: 0.3, seed: s });
      expect(c.x).toBeGreaterThanOrEqual(0);
      expect(c.y).toBeGreaterThanOrEqual(0);
      expect(c.x + c.size).toBeLessThanOrEqual(1);
      expect(c.y + c.size).toBeLessThanOrEqual(1);
    }
    expect(pickCrop({ size: 0.3, seed: 7 })).toEqual(pickCrop({ size: 0.3, seed: 7 }));
  });
  it('never overlaps avoid regions when a clean position exists', () => {
    const avoid = [{ x: 0.05, y: 0.05, w: 0.9, h: 0.2 }, { x: 0.05, y: 0.86, w: 0.9, h: 0.1 }];
    for (let s = 0; s < 200; s++) {
      const c = pickCrop({ size: 0.4, avoid, seed: s });
      expect(c.y).toBeGreaterThanOrEqual(0.25 - 0.02);
      expect(c.y + c.size).toBeLessThanOrEqual(0.86 + 0.02);
    }
  });
  it('picks the least bad window when every position overlaps lettering', () => {
    // A band across the middle: no 0.5-size window can avoid it, but windows at the very top or bottom overlap least.
    const avoid = [{ x: 0, y: 0.2, w: 1, h: 0.6 }];
    for (let s = 0; s < 40; s++) {
      const c = pickCrop({ size: 0.5, avoid, seed: s });
      const overlapRows = Math.max(0, Math.min(c.y + 0.5, 0.8) - Math.max(c.y, 0.2));
      expect(overlapRows / 0.5).toBeLessThanOrEqual(0.7);
    }
  });
  it('skips flat regions when the image has detail elsewhere', () => {
    const w = 64;
    const data = new Float32Array(w * w);
    for (let y = 0; y < w; y++) for (let x = 0; x < w; x++) data[y * w + x] = x > 32 ? (x + y) % 2 : 0.5;
    const grid: LumaGrid = { width: w, height: w, data };
    for (let s = 0; s < 30; s++) {
      const c = pickCrop({ size: 0.3, grid, seed: s });
      expect(windowStats(grid, { x: c.x, y: c.y, w: 0.3, h: 0.3 }).contrast).toBeGreaterThan(0.05);
    }
  });
  it('converts a crop to CSS background values', () => {
    expect(cropToBackground({ x: 0, y: 0, size: 0.5 })).toEqual({ backgroundSize: '200.00% auto', backgroundPosition: '0.00% 0.00%' });
    expect(cropToBackground({ x: 0.5, y: 0.25, size: 0.5 }).backgroundPosition).toBe('100.00% 50.00%');
  });
});

describe('question builder', () => {
  it('builds 10 valid rounds for every mode', () => {
    for (const mode of ['easy', 'normal', 'hard'] as const) {
      for (let seed = 1; seed <= 20; seed++) {
        const qs = buildQuiz(catalog, mode, createRng(seed));
        expect(qs).toHaveLength(10);
        expect(new Set(qs.map((q) => q.album.id)).size).toBe(10);
        for (const q of qs) {
          expect(q.answers).toHaveLength(4);
          expect(q.answers.filter((a) => a.albumId === q.album.id)).toHaveLength(1);
          expect(new Set(q.answers.map((a) => a.label)).size).toBe(4);
          expect(new Set(q.answers.map((a) => a.artist)).size).toBe(4);
        }
      }
    }
  });
  it('late rounds use smaller crops than early rounds', () => {
    const qs = buildQuiz(catalog, 'normal', createRng(3));
    expect(qs[9].cropSize).toBeLessThan(qs[0].cropSize);
  });
  it('makes late distractors more similar than early ones, on average', () => {
    const avg = (round: number) => {
      let sum = 0;
      let n = 0;
      for (let seed = 1; seed <= 60; seed++) {
        const q = buildQuiz(catalog, 'normal', createRng(seed))[round - 1];
        for (const a of q.answers) {
          if (a.albumId === q.album.id) continue;
          sum += similarity(q.album, catalog.find((c) => c.id === a.albumId)!);
          n++;
        }
      }
      return sum / n;
    };
    expect(avg(10)).toBeGreaterThan(avg(1) + 0.1);
  });
  it('picks easier albums early and harder albums late', () => {
    let early = 0;
    let late = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const qs = buildQuiz(catalog, 'normal', createRng(seed));
      early += qs[0].album.difficultyScore;
      late += qs[9].album.difficultyScore;
    }
    expect(late / 40).toBeGreaterThan(early / 40 + 20);
  });
  it('works with a pool that is not the mock list', () => {
    const pool: Album[] = Array.from({ length: 12 }, (_, i) => ({
      ...catalog[0], id: `x${i}`, artist: `Band ${i}`, albumTitle: `Album ${i}`, difficultyScore: i * 8,
    }));
    expect(buildQuiz(pool, 'easy', createRng(1))).toHaveLength(10);
  });
  it('throws a clear error when the pool is too small', () => {
    expect(() => buildQuiz(catalog.slice(0, 5), 'easy', createRng(1))).toThrow(/at least/);
  });
});

describe('reducer', () => {
  const play = (): GameState => {
    let s = gameReducer(initialState, { type: 'LOAD', difficulty: 'normal', category: 'all', mode: 'classic' });
    return gameReducer(s, { type: 'READY', questions: buildQuiz(catalog, 'normal', createRng(5)) });
  };

  it('scores correct answers, tracks streak and ignores double answers', () => {
    let s = play();
    if (s.phase !== 'playing') throw new Error();
    const q = s.questions[0];
    s = gameReducer(s, { type: 'ANSWER', albumId: q.album.id });
    if (s.phase !== 'playing') throw new Error();
    expect(s.streak).toBe(1);
    expect(s.score).toBeGreaterThan(0);
    const score = s.score;
    s = gameReducer(s, { type: 'ANSWER', albumId: q.answers.find((a) => a.albumId !== q.album.id)!.albumId });
    if (s.phase !== 'playing') throw new Error();
    expect(s.score).toBe(score);
  });

  it('resets the streak on a wrong answer but keeps the best streak', () => {
    let s = play();
    for (let i = 0; i < 3; i++) {
      if (s.phase !== 'playing') throw new Error();
      s = gameReducer(s, { type: 'ANSWER', albumId: s.questions[s.index].album.id });
      s = gameReducer(s, { type: 'NEXT' });
    }
    if (s.phase !== 'playing') throw new Error();
    const q = s.questions[s.index];
    s = gameReducer(s, { type: 'ANSWER', albumId: q.answers.find((a) => a.albumId !== q.album.id)!.albumId });
    if (s.phase !== 'playing') throw new Error();
    expect([s.streak, s.bestStreak]).toEqual([0, 3]);
  });

  it('plays a full game to the results screen', () => {
    let s = play();
    for (let i = 0; i < 10; i++) {
      if (s.phase !== 'playing') throw new Error();
      s = gameReducer(s, { type: 'NEXT' }); // cannot advance before answering
      if (s.phase !== 'playing') throw new Error();
      expect(s.index).toBe(i);
      s = gameReducer(s, { type: 'ANSWER', albumId: s.questions[i].album.id });
      s = gameReducer(s, { type: 'NEXT' });
    }
    expect(s.phase).toBe('results');
    if (s.phase !== 'results') throw new Error();
    expect(summarize(s.results)).toEqual({ correct: 10, total: 10, accuracy: 100 });
  });

  it('updates a question when its cover is resolved or fails', () => {
    let s = play();
    if (s.phase !== 'playing') throw new Error();
    const id = s.questions[1].id;
    s = gameReducer(s, { type: 'COVER_RESOLVED', questionId: id, coverImageUrl: 'https://x/y.jpg' });
    if (s.phase !== 'playing') throw new Error();
    expect(s.questions[1].album.coverImageUrl).toBe('https://x/y.jpg');
    expect(s.questions[1].coverStatus).toBe('ready');
    s = gameReducer(s, { type: 'COVER_FAILED', questionId: s.questions[2].id });
    if (s.phase !== 'playing') throw new Error();
    expect(s.questions[2].coverStatus).toBe('failed');
  });

  it('marks questions pending when the album has no cover yet', () => {
    const noCover = catalog.map((a) => ({ ...a, coverImageUrl: '' }));
    expect(buildQuiz(noCover, 'easy', createRng(1)).every((q) => q.coverStatus === 'pending')).toBe(true);
  });

  it('excludes skipped rounds from accuracy and keeps the streak', () => {
    let s = play();
    if (s.phase !== 'playing') throw new Error();
    s = gameReducer(s, { type: 'ANSWER', albumId: s.questions[0].album.id });
    s = gameReducer(s, { type: 'NEXT' });
    s = gameReducer(s, { type: 'SKIP' });
    if (s.phase !== 'playing') throw new Error();
    expect(s.streak).toBe(1);
    expect(summarize(s.results)).toEqual({ correct: 1, total: 1, accuracy: 100 });
  });
});

describe('categories', () => {
  it.each([
    ['Thrash Metal', 'thrash'], ['Thrash', 'thrash'], ['Technical Thrash Metal', 'thrash'], ['Groove Metal', 'thrash'],
    ['Death Metal', 'death'], ['Melodic Death Metal', 'death'], ['Technical Death Metal', 'death'],
    ['Grindcore', 'grind'], ['Goregrind', 'grind'], ['Crust', 'grind'], ['Deathgrind', 'grind'],
    ['Sludge Metal', 'sludge'], ['Sludge Doom', 'sludge'],
    ['Black Metal', 'black'], ['Blackened Death Metal', 'black'], ['Symphonic Black Metal', 'black'],
    ['Doom Metal', 'doom'], ['Stoner Rock', 'doom'], ['Power Metal', 'heavy'], ['Symphonic Power Metal', 'heavy'],
    ['Progressive Metal', 'heavy'], ['Progressive Death Metal', 'death'],
    ['NWOBHM', 'heavy'], ['Heavy Metal', 'heavy'], ['Speed Metal', 'heavy'], ['Folk Metal', 'heavy'],
  ])('%s is %s', (sub, cat) => expect(categoryOf(sub)).toBe(cat));

  it('every category can fill a full game from the mock catalogue, in every mode', () => {
    for (const c of CATEGORIES) {
      const pool = filterByCategory(catalog, c);
      expect(pool.length, c).toBeGreaterThanOrEqual(10);
      for (const mode of ['easy', 'normal', 'hard'] as const) {
        const qs = buildQuiz(pool, mode, createRng(11));
        expect(qs).toHaveLength(10);
        if (c !== 'all') expect(qs.every((q) => categoryOf(q.album.subgenre) === c)).toBe(true);
        // distractors also come from the chosen genre
        for (const q of qs) for (const a of q.answers) expect(pool.some((p) => p.id === a.albumId)).toBe(true);
      }
    }
  });

  it('keeps the category through the reducer', () => {
    let s = gameReducer(initialState, { type: 'SET_CATEGORY', category: 'death' });
    s = gameReducer(s, { type: 'LOAD', difficulty: 'hard', category: 'death', mode: 'classic' });
    expect(s).toMatchObject({ phase: 'loading', category: 'death' });
    s = gameReducer(s, { type: 'LOAD_FAILED', message: 'x' });
    s = gameReducer(s, { type: 'RESET' });
    expect(s).toMatchObject({ phase: 'start', category: 'death' });
  });
});

describe('zoom mode', () => {
  const start = { x: 0.1, y: 0.6, size: 0.2 };

  it('zoomWindow starts at the crop, ends on the whole cover and always stays inside', () => {
    expect(zoomWindow(start, 0)).toEqual(start);
    expect(zoomWindow(start, 1)).toEqual({ x: 0, y: 0, size: 1 });
    let prev = 0;
    for (let i = 0; i <= 100; i++) {
      const w = zoomWindow(start, i / 100);
      expect(w.size).toBeGreaterThanOrEqual(prev);
      prev = w.size;
      expect(w.x).toBeGreaterThanOrEqual(0);
      expect(w.y).toBeGreaterThanOrEqual(0);
      expect(w.x + w.size).toBeLessThanOrEqual(1 + 1e-9);
      expect(w.y + w.size).toBeLessThanOrEqual(1 + 1e-9);
    }
  });
  it('zooms evenly: size grows by the same factor per step', () => {
    const a = zoomWindow(start, 0.25).size / zoomWindow(start, 0).size;
    const b = zoomWindow(start, 0.5).size / zoomWindow(start, 0.25).size;
    expect(a).toBeCloseTo(b, 6);
  });
  it('pays most for early answers, never below 0.1x and clamps bad input', () => {
    expect(zoomTimeFactor(0)).toBeCloseTo(1.5);
    expect(zoomTimeFactor(1)).toBeCloseTo(0.1);
    expect(zoomTimeFactor(0.2)).toBeGreaterThan(zoomTimeFactor(0.8));
    expect(zoomTimeFactor(5)).toBeCloseTo(0.1);
    expect(zoomTimeFactor(-1)).toBeCloseTo(1.5);
  });
  it('falls from the start, gets steeper and is gone well before the cover is fully shown', () => {
    expect(zoomTimeFactor(0.1)).toBeLessThan(1.5);
    expect(zoomTimeFactor(0.25)).toBeLessThan(1.3);
    expect(zoomTimeFactor(0.4)).toBeLessThan(1.0);
    // half of the bonus is gone after about a third of the time
    expect(zoomTimeFactor(0.4)).toBeLessThan(0.1 + 1.4 * 0.6);
    expect(zoomTimeFactor(0.5)).toBeLessThan(0.7);
    expect(zoomTimeFactor(0.6)).toBeLessThan(0.35);
    expect(zoomTimeFactor(ZOOM_BONUS_ENDS_AT)).toBeCloseTo(0.1);
    expect(zoomTimeFactor(0.8)).toBeCloseTo(0.1);
    // the fall gets steeper: the loss over a late stretch is much bigger than over an equally long early one
    const loss = (from: number, to: number) => zoomTimeFactor(from) - zoomTimeFactor(to);
    expect(loss(0.5, 0.6)).toBeGreaterThan(loss(0.1, 0.2) * 2);
    // and it never goes up
    let prev = Infinity;
    for (let i = 0; i <= 100; i++) {
      const f = zoomTimeFactor(i / 100);
      expect(f).toBeLessThanOrEqual(prev);
      prev = f;
    }
  });
  it('the bonus left is 1 at the start and 0 from the end point on', () => {
    expect(zoomBonusLeft(0)).toBe(1);
    expect(zoomBonusLeft(ZOOM_BONUS_ENDS_AT)).toBe(0);
    expect(zoomBonusLeft(1)).toBe(0);
    expect(zoomBonusLeft(0.2)).toBeGreaterThan(0.8);
  });
  it('scales points by the zoom progress', () => {
    const base = { album: { difficultyScore: 50 }, round: 1, streak: 1, difficulty: 'easy' as const };
    expect(scoreCorrectAnswer({ ...base }).total).toBe(200);
    expect(scoreCorrectAnswer({ ...base, zoomProgress: 0 }).total).toBe(300);
    expect(scoreCorrectAnswer({ ...base, zoomProgress: 1 }).total).toBe(20);
  });
  it('zoom rounds start smaller and faster in later rounds and with higher difficulty', () => {
    const p = (d: 'easy' | 'normal' | 'hard', r: number) => getRoundProfile(d, r, 10, 'zoom');
    expect(p('normal', 10).cropSize).toBeLessThan(p('normal', 1).cropSize);
    expect(p('normal', 10).zoomDurationMs!).toBeLessThan(p('normal', 1).zoomDurationMs!);
    expect(p('hard', 5).cropSize).toBeLessThan(p('easy', 5).cropSize);
    expect(getRoundProfile('normal', 1).zoomDurationMs).toBeUndefined();
  });
  it('buildQuiz sets a duration only in zoom mode', () => {
    const zoom = buildQuiz(catalog, 'normal', createRng(2), 10, 'zoom');
    expect(zoom.every((q) => q.zoomDurationMs && q.zoomDurationMs > 5000)).toBe(true);
    expect(zoom.every((q) => q.cropSize >= 0.08 && q.cropSize <= 0.26)).toBe(true);
    expect(buildQuiz(catalog, 'normal', createRng(2)).every((q) => q.zoomDurationMs === undefined)).toBe(true);
  });
  it('reducer scores the zoom progress and ignores it in classic mode', () => {
    const run = (mode: 'zoom' | 'classic', zoomProgress?: number) => {
      let s = gameReducer(initialState, { type: 'LOAD', difficulty: 'easy', category: 'all', mode });
      s = gameReducer(s, { type: 'READY', questions: buildQuiz(catalog, 'easy', createRng(5), 10, mode) });
      if (s.phase !== 'playing') throw new Error();
      s = gameReducer(s, { type: 'ANSWER', albumId: s.questions[0].album.id, zoomProgress });
      if (s.phase !== 'playing') throw new Error();
      return s;
    };
    expect(run('zoom', 0).score).toBeGreaterThan(run('zoom', 1).score);
    expect(run('zoom', 0).results[0].zoomProgress).toBe(0);
    expect(run('classic', 0).score).toBe(run('classic', 1).score);
    expect(run('classic', 1).results[0].zoomProgress).toBeUndefined();
  });
  it('keeps the mode through SET_MODE and RESET', () => {
    let s = gameReducer(initialState, { type: 'SET_MODE', mode: 'zoom' });
    s = gameReducer(s, { type: 'LOAD', difficulty: 'normal', category: 'all', mode: 'zoom' });
    s = gameReducer(s, { type: 'LOAD_FAILED', message: 'x' });
    s = gameReducer(s, { type: 'RESET' });
    expect(s).toMatchObject({ phase: 'start', mode: 'zoom' });
  });
});

describe('variety', () => {
  const distinctTargets = (games: number, recent?: Set<string>) => {
    const counts = new Map<string, number>();
    for (let g = 0; g < games; g++) {
      for (const q of buildQuiz(catalog, 'normal', createRng(500 + g), 10, 'classic', recent)) {
        counts.set(q.album.id, (counts.get(q.album.id) ?? 0) + 1);
      }
    }
    return counts;
  };

  it('does not keep serving the same albums', () => {
    const counts = distinctTargets(40);
    expect(counts.size).toBeGreaterThan(80);
    expect(Math.max(...counts.values())).toBeLessThan(40 * 0.3);
  });

  it('still gets harder over the game', () => {
    let early = 0;
    let late = 0;
    for (let g = 0; g < 60; g++) {
      const qs = buildQuiz(catalog, 'normal', createRng(900 + g));
      early += qs[0].album.difficultyScore + qs[1].album.difficultyScore;
      late += qs[8].album.difficultyScore + qs[9].album.difficultyScore;
    }
    expect(late / 120).toBeGreaterThan(early / 120 + 20);
  });

  it('prefers albums the player has not seen recently', () => {
    const recent = new Set(catalog.slice(0, 60).map((a) => a.id));
    const counts = distinctTargets(40, recent);
    const seenShare = [...counts].filter(([id]) => recent.has(id)).reduce((n, [, c]) => n + c, 0) / 400;
    expect(seenShare).toBeLessThan(0.2);
  });
});

describe('cover refresh', () => {
  const playing = (s: GameState) => {
    if (s.phase !== 'playing') throw new Error('expected the playing phase');
    return s;
  };
  const start = () => {
    const loading = gameReducer(initialState, { type: 'LOAD', difficulty: 'normal', category: 'all', mode: 'classic' });
    return playing(gameReducer(loading, { type: 'READY', questions: buildQuiz(catalog, 'normal', createRng(3)) }));
  };
  it('goes pending, then ready with the new URL', () => {
    const id = start().questions[0].id;
    const pending = playing(gameReducer(start(), { type: 'COVER_REFRESH', questionId: id }));
    expect(pending.questions[0].coverStatus).toBe('pending');
    const done = playing(gameReducer(pending, { type: 'COVER_RESOLVED', questionId: id, coverImageUrl: 'https://x/new.jpg' }));
    expect([done.questions[0].coverStatus, done.questions[0].album.coverImageUrl]).toEqual(['ready', 'https://x/new.jpg']);
  });
  it('can fail after a refresh and leaves other questions alone', () => {
    const base = start();
    const id = base.questions[1].id;
    const refreshing = gameReducer(base, { type: 'COVER_REFRESH', questionId: id });
    const failed = playing(gameReducer(refreshing, { type: 'COVER_FAILED', questionId: id }));
    expect(failed.questions[1].coverStatus).toBe('failed');
    expect(failed.questions[0].coverStatus).toBe('ready');
  });
});

describe('verdict copy', () => {
  it('is stable per round, differs between rounds and matches the result', () => {
    expect(verdictLine(true, 3)).toBe(verdictLine(true, 3));
    expect(new Set([1, 2, 3, 4, 5].map((r) => verdictLine(false, r))).size).toBeGreaterThan(3);
    for (let r = 1; r <= 10; r++) {
      expect(verdictLine(true, r)).toMatch(/correct/i);
      expect(verdictLine(false, r)).toMatch(/wrong/i);
    }
    expect(SKIPPED_LINE.length).toBeGreaterThan(0);
  });
});

describe('answer time', () => {
  it('formats times', () => {
    expect(formatTime(0)).toBe('0.0 s');
    expect(formatTime(4234)).toBe('4.2 s');
    expect(formatTime(59949)).toBe('59.9 s');
    expect(formatTime(65000)).toBe('1:05');
    expect(formatTime(-5)).toBe('0.0 s');
  });
  it('stores the time of each answer', () => {
    let s = gameReducer(initialState, { type: 'LOAD', difficulty: 'normal', category: 'all', mode: 'classic' });
    s = gameReducer(s, { type: 'READY', questions: buildQuiz(catalog, 'normal', createRng(8)) });
    if (s.phase !== 'playing') throw new Error();
    s = gameReducer(s, { type: 'ANSWER', albumId: s.questions[0].album.id, timeMs: 3200 });
    if (s.phase !== 'playing') throw new Error();
    expect(s.results[0].timeMs).toBe(3200);
  });
});
