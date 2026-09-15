import type { Redis } from "ioredis";
import type { CachedValue, ReusableCache } from "./reusable-cache.js";

interface Envelope {
  readonly value: unknown;
  readonly checkedAt: string;
}

/**
 * PRD 14.1 and AC-14.1 — Redis is the mandatory reusable result cache.
 * A cache miss or a Redis failure is never an error of the scan: the caller simply retrieves the
 * value again, so an unavailable cache degrades throughput rather than correctness.
 */
export function createRedisCache(client: Redis): ReusableCache {
  return {
    async get<TValue>(key: string): Promise<CachedValue<TValue> | undefined> {
      let raw: string | null;
      try {
        raw = await client.get(key);
      } catch {
        return undefined;
      }
      if (raw === null) {
        return undefined;
      }
      try {
        const envelope = JSON.parse(raw) as Envelope;
        return {
          value: envelope.value as TValue,
          checkedAt: envelope.checkedAt,
          ageSeconds: Math.max(0, Math.floor((Date.now() - Date.parse(envelope.checkedAt)) / 1000)),
        };
      } catch {
        return undefined;
      }
    },

    async set(key, value, ttlSeconds, checkedAt) {
      const envelope: Envelope = { value, checkedAt: checkedAt ?? new Date().toISOString() };
      try {
        await client.set(key, JSON.stringify(envelope), "EX", Math.max(1, Math.floor(ttlSeconds)));
      } catch {
        // A cache that cannot be written does not fail the scan.
      }
    },
  };
}
