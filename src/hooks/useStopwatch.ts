import { useCallback, useEffect, useRef } from 'react';

/**
 * Measures how long the player takes on one question. It starts when `running` first becomes true for a
 * `resetKey` (the artwork is visible and answers are enabled), and time spent with the tab hidden is not counted.
 * `read()` returns the elapsed milliseconds at the moment it is called.
 */
export function useStopwatch(resetKey: string, running: boolean): () => number {
  const clock = useRef({ key: '', startedAt: 0, hiddenAt: 0, hiddenTotal: 0 });

  useEffect(() => {
    const c = clock.current;
    if (c.key !== resetKey) {
      c.key = resetKey;
      c.startedAt = 0;
      c.hiddenAt = 0;
      c.hiddenTotal = 0;
    }
    if (running && !c.startedAt) c.startedAt = performance.now();
  }, [resetKey, running]);

  useEffect(() => {
    const onVisibility = () => {
      const c = clock.current;
      if (document.hidden) {
        c.hiddenAt = performance.now();
      } else if (c.hiddenAt) {
        c.hiddenTotal += performance.now() - c.hiddenAt;
        c.hiddenAt = 0;
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  return useCallback(() => {
    const c = clock.current;
    if (!c.startedAt) return 0;
    const now = c.hiddenAt || performance.now();
    return Math.max(0, now - c.startedAt - c.hiddenTotal);
  }, []);
}
