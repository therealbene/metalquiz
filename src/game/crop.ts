import type { Rect } from '../domain/types';
import { createRng, type Rng } from './rng';

/** Square crop, all values normalised to the image side (0..1). */
export interface CropRegion {
  x: number;
  y: number;
  size: number;
}

/** Low-resolution luminance grid (0..1) sampled from the artwork. */
export interface LumaGrid {
  width: number;
  height: number;
  data: ArrayLike<number>;
}

/**
 * Typical logo and title zones when we have no per-album hints.
 * Heavy-metal covers overwhelmingly put the band logo near the top and the title near the bottom.
 */
export const DEFAULT_TEXT_ZONES: Rect[] = [
  { x: 0, y: 0, w: 1, h: 0.2 },
  { x: 0, y: 0.84, w: 1, h: 0.16 },
];

const ATTEMPTS = 120;

function overlapArea(a: Rect, b: Rect): number {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? w * h : 0;
}

interface WindowStats {
  /** Standard deviation of luminance. Flat areas (sky, black void) score near 0. */
  contrast: number;
  /** Share of neighbouring pixel pairs with a sharp jump. Text and logos are edge-dense. */
  edgeDensity: number;
}

export function windowStats(grid: LumaGrid, r: Rect): WindowStats {
  const x0 = Math.max(0, Math.floor(r.x * grid.width));
  const y0 = Math.max(0, Math.floor(r.y * grid.height));
  const x1 = Math.min(grid.width, Math.max(x0 + 2, Math.ceil((r.x + r.w) * grid.width)));
  const y1 = Math.min(grid.height, Math.max(y0 + 2, Math.ceil((r.y + r.h) * grid.height)));
  let sum = 0;
  let sumSq = 0;
  let n = 0;
  let edges = 0;
  let pairs = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const v = grid.data[y * grid.width + x];
      sum += v;
      sumSq += v * v;
      n++;
      if (x + 1 < x1) {
        pairs++;
        if (Math.abs(v - grid.data[y * grid.width + x + 1]) > 0.28) edges++;
      }
      if (y + 1 < y1) {
        pairs++;
        if (Math.abs(v - grid.data[(y + 1) * grid.width + x]) > 0.28) edges++;
      }
    }
  }
  const mean = sum / Math.max(n, 1);
  const variance = Math.max(0, sumSq / Math.max(n, 1) - mean * mean);
  return { contrast: Math.sqrt(variance), edgeDensity: edges / Math.max(pairs, 1) };
}

function scoreCandidate(
  rect: Rect,
  grid: LumaGrid | null,
  avoid: Rect[],
  textZones: Rect[],
): number {
  const area = rect.w * rect.h;
  // Hard reject: anything that clips a known logo/title region.
  for (const a of avoid) if (overlapArea(rect, a) > 0.02 * area) return -Infinity;

  let score = 0;
  // Soft penalty for the typical logo zones when no explicit hints were given.
  if (avoid.length === 0) {
    for (const z of textZones) score -= (overlapArea(rect, z) / area) * 1.2;
  }
  if (grid) {
    const s = windowStats(grid, rect);
    if (s.contrast < 0.05) return -Infinity; // nothing to recognise in a flat area
    score += Math.min(s.contrast, 0.3) * 4;
    // Very edge-dense windows are likely lettering. Allow moderate detail.
    score -= Math.max(0, s.edgeDensity - 0.22) * 6;
  }
  return score;
}

export interface PickCropOptions {
  size: number;
  grid?: LumaGrid | null;
  avoid?: Rect[];
  rng?: Rng;
  seed?: number;
}

/**
 * Picks a random crop that is visually interesting and avoids text areas.
 * Samples several random candidates and keeps the best-scoring one, so the position stays random
 * while flat or lettered regions are filtered out.
 */
export function pickCrop(opts: PickCropOptions): CropRegion {
  const size = Math.min(Math.max(opts.size, 0.05), 1);
  const rng = opts.rng ?? createRng(opts.seed ?? 1);
  const avoid = opts.avoid ?? [];
  const range = 1 - size;
  let best: CropRegion = { x: range / 2, y: range / 2, size };
  let bestScore = -Infinity;
  let fallback: CropRegion | null = null;

  for (let i = 0; i < ATTEMPTS; i++) {
    const cand: CropRegion = { x: rng() * range, y: rng() * range, size };
    fallback ??= cand;
    const score =
      scoreCandidate({ x: cand.x, y: cand.y, w: size, h: size }, opts.grid ?? null, avoid, DEFAULT_TEXT_ZONES) +
      rng() * 0.6; // jitter keeps the choice unpredictable among similar candidates
    if (score > bestScore) {
      bestScore = score;
      best = cand;
    }
  }
  return bestScore === -Infinity ? (fallback ?? best) : best;
}

/** CSS background properties that show only `crop` of an image inside a square box. */
export function cropToBackground(crop: CropRegion): { backgroundSize: string; backgroundPosition: string } {
  const range = 1 - crop.size;
  const px = range === 0 ? 0 : (crop.x / range) * 100;
  const py = range === 0 ? 0 : (crop.y / range) * 100;
  return {
    backgroundSize: `${(100 / crop.size).toFixed(2)}% auto`,
    backgroundPosition: `${px.toFixed(2)}% ${py.toFixed(2)}%`,
  };
}
