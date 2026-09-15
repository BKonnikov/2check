/**
 * PRD 14.1 — the internal cache for reusing results, distinct in purpose from a provider's own
 * cache and from a historical ScanResult. It stores technical observations, never presentation.
 */
export interface CachedValue<TValue> {
  readonly value: TValue;
  /** PRD 14.5 and 19.5 — the original observation time travels with the value. */
  readonly checkedAt: string;
  readonly ageSeconds: number;
}

export interface ReusableCache {
  get<TValue>(key: string): Promise<CachedValue<TValue> | undefined>;
  set<TValue>(key: string, value: TValue, ttlSeconds: number, checkedAt?: string): Promise<void>;
}

interface StoredEntry {
  readonly value: unknown;
  readonly checkedAt: string;
  readonly expiresAt: number;
}

/** In-process cache for tests and for running without Redis. Not shared between instances. */
export function createInMemoryCache(now: () => number = Date.now): ReusableCache {
  const entries = new Map<string, StoredEntry>();

  return {
    async get<TValue>(key: string) {
      const entry = entries.get(key);
      if (entry === undefined) {
        return undefined;
      }
      if (entry.expiresAt <= now()) {
        entries.delete(key);
        return undefined;
      }
      return {
        value: entry.value as TValue,
        checkedAt: entry.checkedAt,
        ageSeconds: Math.max(0, Math.floor((now() - Date.parse(entry.checkedAt)) / 1000)),
      };
    },

    async set(key, value, ttlSeconds, checkedAt) {
      entries.set(key, {
        value,
        checkedAt: checkedAt ?? new Date(now()).toISOString(),
        expiresAt: now() + ttlSeconds * 1000,
      });
    },
  };
}

/**
 * PRD 14.7 and AC-14.8 — coalesces concurrent identical retrievals.
 * The key is the technical cache key, so no scan identity takes part and two scans are never
 * merged into one another; they only share the one retrieval that is already running.
 */
export function createSingleFlight(): <TValue>(
  key: string,
  retrieve: () => Promise<TValue>,
) => Promise<TValue> {
  const inflight = new Map<string, Promise<unknown>>();

  return async <TValue>(key: string, retrieve: () => Promise<TValue>): Promise<TValue> => {
    const running = inflight.get(key);
    if (running !== undefined) {
      return running as Promise<TValue>;
    }
    const started = retrieve().finally(() => inflight.delete(key));
    inflight.set(key, started);
    return started;
  };
}
