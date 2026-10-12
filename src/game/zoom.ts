import type { CropRegion } from './crop';

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/**
 * The visible window `t` of the way through a zoom-out (0 = the start crop, 1 = the whole cover).
 * Size grows geometrically, so the zoom feels even to the eye. The centre drifts to the middle of the cover.
 */
export function zoomWindow(start: CropRegion, t: number): CropRegion {
  const p = clamp(t, 0, 1);
  const size = start.size * Math.pow(1 / start.size, p);
  const cx = start.x + start.size / 2;
  const cy = start.y + start.size / 2;
  const centreX = cx + (0.5 - cx) * p;
  const centreY = cy + (0.5 - cy) * p;
  return {
    size,
    x: clamp(centreX - size / 2, 0, 1 - size),
    y: clamp(centreY - size / 2, 0, 1 - size),
  };
}

/** Multiplier for an instant answer, and the floor once the whole cover is visible. */
export const ZOOM_FACTOR_MAX = 1.5;
export const ZOOM_FACTOR_MIN = 0.25;

/**
 * How much of the bonus is left at `progress` of the zoom (1 = all of it, 0 = none).
 * Squared, so it drops fast at first and then levels off: the first quarter of the time already costs
 * 44 % of the bonus, and halfway through only a quarter is left.
 */
export function zoomBonusLeft(progress: number): number {
  const left = 1 - clamp(progress, 0, 1);
  return left * left;
}

/** Points multiplier for answering at `progress` of the zoom: 1.5x right away, falling quickly to 0.25x. */
export function zoomTimeFactor(progress: number): number {
  return ZOOM_FACTOR_MIN + (ZOOM_FACTOR_MAX - ZOOM_FACTOR_MIN) * zoomBonusLeft(progress);
}
