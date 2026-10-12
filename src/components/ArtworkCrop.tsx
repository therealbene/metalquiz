import { useLayoutEffect, useRef, type CSSProperties, type MutableRefObject } from 'react';
import { cropToBackground, type CropRegion } from '../game/crop';
import { zoomBonusLeft, zoomTimeFactor, zoomWindow } from '../game/zoom';
import './ArtworkCrop.css';

export interface ZoomConfig {
  /** Time until the whole cover is visible. */
  durationMs: number;
  /** Written every frame with the zoom progress (0..1), so the parent can read it at the moment of answering. */
  progressRef: MutableRefObject<number>;
}

interface Props {
  src: string;
  crop: CropRegion | null;
  revealed: boolean;
  /** Shown to assistive tech only after the reveal, so it never gives the answer away. */
  revealedLabel: string;
  failed?: boolean;
  /** Feedback ring around the artwork after answering. */
  verdict?: 'correct' | 'wrong' | null;
  /** Zoom mode: the crop grows from `crop` to the whole cover over time. */
  zoom?: ZoomConfig;
  onSkip?: () => void;
}

const FULL: CSSProperties = { backgroundSize: '100% auto', backgroundPosition: '0% 0%' };
const REDUCED_MOTION_STEPS = 8;

/**
 * Shows a section of one image using CSS background sizing and positioning,
 * then animates to the full artwork. No extra image files are created.
 *
 * In zoom mode the window is updated every frame straight on the DOM node (no React re-render per frame).
 * The time only advances while the tab is visible, because requestAnimationFrame pauses in the background
 * and each frame is capped at 100 ms.
 */
export function ArtworkCrop({ src, crop, revealed, revealedLabel, failed, verdict, zoom, onSkip }: Props) {
  const imageRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);
  const factorRef = useRef<HTMLSpanElement>(null);
  const zooming = !!zoom && !revealed && !!crop && !failed;
  // Depend on the primitive values: the parent may pass a fresh `zoom` object on every render,
  // and a changed object must not restart a running zoom.
  const durationMs = zoom?.durationMs;
  const progressRef = zoom?.progressRef;

  useLayoutEffect(() => {
    if (durationMs === undefined || !progressRef || !crop || revealed || failed) return;
    const el = imageRef.current;
    if (!el) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let elapsed = 0;
    let last = performance.now();
    let raf = 0;

    const apply = (p: number) => {
      const css = cropToBackground(zoomWindow(crop, p));
      el.style.backgroundSize = css.backgroundSize;
      el.style.backgroundPosition = css.backgroundPosition;
      // The bar and the chip show what the answer is worth right now, which falls faster than the clock runs.
      if (barRef.current) barRef.current.style.transform = `scaleX(${zoomBonusLeft(p)})`;
      if (factorRef.current) factorRef.current.textContent = `×${zoomTimeFactor(p).toFixed(1)}`;
      progressRef.current = p;
    };

    apply(0);
    const tick = (now: number) => {
      elapsed += Math.min(now - last, 100);
      last = now;
      const raw = Math.min(1, elapsed / durationMs);
      // Reduced motion: jump in a few steps instead of a continuous zoom.
      apply(reduced ? Math.floor(raw * REDUCED_MOTION_STEPS) / REDUCED_MOTION_STEPS : raw);
      if (raw < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [durationMs, progressRef, crop, revealed, failed]);

  // In zoom mode the size and position are driven by the effect above, so React only sets the image.
  const style: CSSProperties | undefined =
    crop && !failed
      ? {
          backgroundImage: `url("${src}")`,
          ...(revealed ? FULL : zoom ? undefined : cropToBackground(crop)),
        }
      : undefined;

  const cls = ['artwork', revealed && 'artwork--revealed', zooming && 'artwork--zooming', verdict && `artwork--${verdict}`]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={cls} role="img" aria-label={revealed ? revealedLabel : 'Cropped fragment of an album cover'}>
      <div ref={imageRef} className="artwork__image" style={style} />
      {!crop && !failed && <div className="artwork__skeleton" aria-hidden="true" />}
      {failed && (
        <div className="artwork__error">
          <p>This cover was swallowed by the void.</p>
          {onSkip && (
            <button type="button" className="btn btn--ghost" onClick={onSkip}>
              Banish this round
            </button>
          )}
        </div>
      )}
      {zooming && (
        <div className="artwork__timer" aria-hidden="true">
          <span ref={barRef} className="artwork__timer-bar" />
        </div>
      )}
      {zooming && (
        <span ref={factorRef} className="artwork__factor" aria-hidden="true">
          ×1.5
        </span>
      )}
      <span className="artwork__corner artwork__corner--tl" aria-hidden="true" />
      <span className="artwork__corner artwork__corner--tr" aria-hidden="true" />
      <span className="artwork__corner artwork__corner--bl" aria-hidden="true" />
      <span className="artwork__corner artwork__corner--br" aria-hidden="true" />
    </div>
  );
}
