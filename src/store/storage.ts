/** localStorage access that never throws (private mode, quota, corrupted JSON). */
export function readJson<T>(key: string, fallback: T, store: Storage | undefined = globalThis.localStorage): T {
  try {
    const raw = store?.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown, store: Storage | undefined = globalThis.localStorage): boolean {
  try {
    store?.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
