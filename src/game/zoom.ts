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

/** Points multiplier for answering at `progress` of the zoom: 1.5 right away, 0.4 once the cover is fully shown. */
export function zoomTimeFactor(progress: number): number {
  return 1.5 - 1.1 * clamp(progress, 0, 1);
}
