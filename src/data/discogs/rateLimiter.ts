/**
 * Serialises requests and keeps a minimum gap between them.
 * Discogs allows 60 requests/min when authenticated and 25/min when not, and answers 429 when exceeded.
 */
export class RateLimiter {
  private nextSlot = 0;

  constructor(
    private readonly minIntervalMs: number,
    private readonly now: () => number = Date.now,
    private readonly sleep: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms)),
  ) {}

  /** Resolves when the caller may send its request. */
  async acquire(): Promise<void> {
    const t = this.now();
    const start = Math.max(t, this.nextSlot);
    this.nextSlot = start + this.minIntervalMs;
    if (start > t) await this.sleep(start - t);
  }

  /** Push the next slot back, e.g. after a 429 with Retry-After. */
  backoff(ms: number): void {
    this.nextSlot = Math.max(this.nextSlot, this.now() + ms);
  }
}
