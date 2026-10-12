import type { Album, Answer, Difficulty, Question } from '../domain/types';
import { getRoundProfile, ROUNDS_PER_GAME } from './difficulty';
import { shuffle, type Rng } from './rng';

export const ANSWERS_PER_QUESTION = 4;

export function answerFor(album: Album): Answer {
  return {
    albumId: album.id,
    artist: album.artist,
    albumTitle: album.albumTitle,
    label: `${album.artist} — ${album.albumTitle}`,
  };
}

/** 0..1, how alike two albums feel (era, genre, art style, fame). */
export function similarity(a: Album, b: Album): number {
  let s = 0;
  if (a.subgenre === b.subgenre) s += 0.35;
  s += 0.3 * (1 - Math.min(Math.abs(a.year - b.year), 20) / 20);
  if (a.visualStyle && a.visualStyle === b.visualStyle) s += 0.15;
  s += 0.2 * (1 - Math.abs(a.popularityScore - b.popularityScore) / 100);
  return s;
}

/** Picks the album for a round: close to the target difficulty, with some randomness and variety. */
export function pickTargetAlbum(
  pool: Album[],
  targetDifficulty: number,
  usedIds: Set<string>,
  usedArtists: Set<string>,
  rng: Rng,
): Album {
  const candidates = pool
    .filter((a) => !usedIds.has(a.id))
    .map((a) => ({
      album: a,
      // Lower is better. Repeating an artist is discouraged, not forbidden.
      cost: Math.abs(a.difficultyScore - targetDifficulty) + (usedArtists.has(a.artist) ? 25 : 0),
    }))
    .sort((x, y) => x.cost - y.cost);
  if (candidates.length === 0) throw new Error('Not enough albums to build a round.');
  const top = candidates.slice(0, Math.min(6, candidates.length));
  return top[Math.floor(rng() * top.length)].album;
}

/**
 * Picks distractors. `similarityLevel` blends a random ranking (0) with a similarity ranking (1).
 * Distractors never share an artist with each other or the target, so every option is a distinct band.
 */
export function pickDistractors(
  target: Album,
  pool: Album[],
  similarityLevel: number,
  count: number,
  rng: Rng,
): Album[] {
  const ranked = pool
    .filter((a) => a.id !== target.id && a.artist !== target.artist)
    .map((a) => ({
      album: a,
      rank: (1 - similarityLevel) * rng() + similarityLevel * (similarity(target, a) + rng() * 0.08),
    }))
    .sort((x, y) => y.rank - x.rank);

  const picked: Album[] = [];
  const artists = new Set<string>();
  for (const { album } of ranked) {
    if (artists.has(album.artist)) continue;
    picked.push(album);
    artists.add(album.artist);
    if (picked.length === count) break;
  }
  if (picked.length < count) throw new Error('Not enough distinct albums for distractors.');
  return picked;
}

export function buildQuiz(
  pool: Album[],
  difficulty: Difficulty,
  rng: Rng,
  rounds = ROUNDS_PER_GAME,
): Question[] {
  const artistCount = new Set(pool.map((a) => a.artist)).size;
  if (pool.length < rounds || artistCount < ANSWERS_PER_QUESTION) {
    throw new Error(`Need at least ${Math.max(rounds, ANSWERS_PER_QUESTION)} albums to start a quiz.`);
  }
  const usedIds = new Set<string>();
  const usedArtists = new Set<string>();
  const questions: Question[] = [];

  for (let round = 1; round <= rounds; round++) {
    const profile = getRoundProfile(difficulty, round, rounds);
    const album = pickTargetAlbum(pool, profile.targetAlbumDifficulty, usedIds, usedArtists, rng);
    usedIds.add(album.id);
    usedArtists.add(album.artist);
    const distractors = pickDistractors(album, pool, profile.distractorSimilarity, ANSWERS_PER_QUESTION - 1, rng);
    questions.push({
      id: `${round}-${album.id}`,
      round,
      album,
      answers: shuffle([album, ...distractors], rng).map(answerFor),
      coverStatus: album.coverImageUrl ? 'ready' : 'pending',
      cropSize: profile.cropSize,
      cropSeed: Math.floor(rng() * 2 ** 32),
    });
  }
  return questions;
}
