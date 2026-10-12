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

/** Multiplier for an instant answer, and the floor once the bonus is gone. */
export const ZOOM_FACTOR_MAX = 1.5;
export const ZOOM_FACTOR_MIN = 0.1;
/** Share of the zoom time after which the bonus is used up. By then the cover is mostly readable. */
export const ZOOM_BONUS_ENDS_AT = 0.65;
/** Above 1 the bonus falls slowly at first and ever faster towards the end; the higher, the later the drop. */
const FALL_EXPONENT = 1.7;

/**
 * How much of the bonus is left at `progress` of the zoom (1 = all of it, 0 = none).
 * It falls from the start, ever faster, and reaches 0 at ZOOM_BONUS_ENDS_AT, before the cover is fully shown,
 * so an answer that is easy because the cover is already readable earns almost nothing.
 */
export function zoomBonusLeft(progress: number): number {
  const t = clamp(progress, 0, 1) / ZOOM_BONUS_ENDS_AT;
  return Math.max(0, 1 - Math.pow(t, FALL_EXPONENT));
}

/** Points multiplier for answering at `progress` of the zoom: 1.5x right away, falling to 0.1x. */
export function zoomTimeFactor(progress: number): number {
  return ZOOM_FACTOR_MIN + (ZOOM_FACTOR_MAX - ZOOM_FACTOR_MIN) * zoomBonusLeft(progress);
}
