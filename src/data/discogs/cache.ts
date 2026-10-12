export interface Cache {
  get<T>(key: string): T | null;
  set<T>(key: string, value: T): void;
}

/** localStorage cache with a TTL. Falls back to a no-op when storage is unavailable or full. */
export class LocalStorageCache implements Cache {
  constructor(
    private readonly ttlMs: number,
    private readonly prefix = 'mcq:discogs:',
  ) {}

  get<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(this.prefix + key);
      if (!raw) return null;
      const { at, value } = JSON.parse(raw) as { at: number; value: T };
      return Date.now() - at > this.ttlMs ? null : value;
    } catch {
      return null;
    }
  }

  set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(this.prefix + key, JSON.stringify({ at: Date.now(), value }));
    } catch {
      /* storage full or blocked: caching is best effort */
    }
  }
}

export class MemoryCache implements Cache {
  private store = new Map<string, unknown>();
  get<T>(key: string): T | null {
    return (this.store.get(key) as T | undefined) ?? null;
  }
  set<T>(key: string, value: T): void {
    this.store.set(key, value);
  }
}
