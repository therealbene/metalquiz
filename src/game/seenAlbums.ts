const KEY = 'mcq:seen';
const MAX = 400;

/** Remembers which albums were shown recently (in this browser), so new games prefer fresh ones. */
export function loadSeen(): Set<string> {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    return new Set(Array.isArray(list) ? list.filter((x): x is string => typeof x === 'string') : []);
  } catch {
    return new Set();
  }
}

export function rememberSeen(ids: string[]): void {
  try {
    const merged = [...loadSeen().values(), ...ids];
    // Keep the newest entries only. A Set keeps insertion order, so re-adding moves an id to the end.
    const unique = [...new Set(merged.reverse())].reverse().slice(-MAX);
    localStorage.setItem(KEY, JSON.stringify(unique));
  } catch {
    /* storage blocked or full: variety just falls back to randomness */
  }
}
