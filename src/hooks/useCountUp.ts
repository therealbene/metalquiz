import { useEffect, useRef, useState } from 'react';

/** Animates a number towards `target`. Respects reduced motion. */
export function useCountUp(target: number, durationMs = 450): number {
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);

  useEffect(() => {
    const from = fromRef.current;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (from === target || reduced) {
      fromRef.current = target;
      setValue(target);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / durationMs);
      const eased = 1 - Math.pow(1 - p, 3);
      const current = Math.round(from + (target - from) * eased);
      fromRef.current = current;
      setValue(current);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);

  return value;
}
