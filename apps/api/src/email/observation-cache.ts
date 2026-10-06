import type { CacheMode } from "@2check/contracts";
import type { StarttlsOutcome } from "@2check/domain";
import { mayReadCache, mayWriteCache } from "@2check/domain";
import type { ReusableCache } from "../cache/reusable-cache.js";
import type { TxtAnswer } from "./txt-lookup.js";

/**
 * 1.1 §12 — caching what the mail category observed, not what it concluded.
 *
 * The stored value is always the raw answer: the TXT records a walk read, a host's addresses, the
 * names its addresses answer with, the outcome of one SMTP session. Evaluation then runs fresh
 * over them, which is what lets a change of scoring policy alone reuse a compatible observation
 * (1.0 §20.4) while a change of this module's configuration does not — that version is in the key.
 *
 * Nothing here stores an observation that was not made. §12.3 names two cases and they share one
 * shape: a DMARC walk that did not finish and an encryption probe that did not complete are
 * absences of knowledge, and keeping them would turn "we could not look" into "we looked and
 * found nothing" for the next hour.
 */

export interface ObservationCacheOptions {
  readonly cache: ReusableCache;
  readonly cacheMode: CacheMode;
  readonly key: string;
  readonly ttlSeconds: number;
  /**
   * When the observation was made, which is the time the check will report — 1.0 §6.3 and AC-6.5.
   * It is stored with the value rather than taken at the moment of writing, so a result read back
   * an hour later names the moment it was observed and not the moment it was filed.
   */
  readonly observedAt: string;
}

/** What was read, and when it was first observed. */
export interface ObservationResult<TValue> {
  readonly value: TValue;
  readonly checkedAt?: string;
  readonly age?: number;
}

/** The answers one policy walk read, keyed by the name each was read at. */
export type PolicyObservations = Readonly<Record<string, TxtAnswer>>;

export interface CachedPolicyWalk {
  /** Hands the walk its answers: from the stored set on a hit, from the port otherwise. */
  readonly lookup: (name: string) => Promise<TxtAnswer>;
  /** When the stored observation was made, and how old it was, when one was used. */
  observed(): { readonly checkedAt?: string; readonly age?: number };
  /** Stores what the walk read, unless any of it was indeterminate. */
  commit(): Promise<void>;
}

function definite(answer: TxtAnswer): boolean {
  return answer.outcome !== "INDETERMINATE";
}

/**
 * One cache entry per policy walk, which is what §12.1's key describes: not one entry per name.
 *
 * A walk is a decision procedure over the answers it reads, so replaying it against the same
 * answers reaches the same place. Storing the set rather than the verdict keeps the stored thing
 * an observation, and keeps the next release's rules from inheriting this release's conclusions.
 */
export function cachePolicyWalk(
  lookup: (name: string) => Promise<TxtAnswer>,
  options: ObservationCacheOptions,
): CachedPolicyWalk {
  const read: Record<string, TxtAnswer> = {};
  let stored: PolicyObservations | undefined;
  let checkedAt: string | undefined;
  let ageSeconds: number | undefined;
  let loaded = false;

  const load = async (): Promise<void> => {
    if (loaded) {
      return;
    }
    loaded = true;
    if (!mayReadCache(options.cacheMode)) {
      return;
    }
    const hit = await options.cache.get<PolicyObservations>(options.key);
    if (hit !== undefined) {
      stored = hit.value;
      checkedAt = hit.checkedAt;
      ageSeconds = hit.ageSeconds;
    }
  };

  return {
    async lookup(name) {
      await load();
      const kept = stored?.[name];
      if (kept !== undefined) {
        return kept;
      }
      /**
       * A name the stored set does not cover is asked for afresh, and the entry is then left
       * alone: a partial replay is not the observation that was stored, and writing the mixture
       * back under the same key would blur two moments into one.
       */
      const answer = await lookup(name);
      if (stored === undefined) {
        read[name] = answer;
      }
      return answer;
    },

    observed() {
      return stored === undefined
        ? {}
        : { ...(checkedAt === undefined ? {} : { checkedAt }), age: ageSeconds };
    },

    async commit() {
      const answers = Object.values(read);
      if (
        stored !== undefined ||
        answers.length === 0 ||
        !mayWriteCache(options.cacheMode) ||
        !answers.every(definite)
      ) {
        return;
      }
      await options.cache.set(options.key, read, options.ttlSeconds, options.observedAt);
    },
  };
}

interface Fingerprinted<TValue> {
  readonly value: TValue;
  readonly fingerprint: string;
}

/**
 * One observation under its own key, used for a host's addresses, its reverse names and its SMTP
 * outcome. `cacheable` is asked about the value the retrieval produced, because only the value
 * says whether anything was actually observed.
 *
 * `fingerprint` carries PRD 14.6's rule into this category: a stored result is reused only while
 * the conditions it was obtained under still hold. An SMTP outcome is the case that needs it —
 * the observation belongs to a host, but it was made against the addresses that host had at the
 * time, and a host that now answers at different addresses is not the host that was probed.
 */
export async function cacheObservation<TValue>(
  options: ObservationCacheOptions & {
    retrieve: () => Promise<TValue>;
    cacheable: (value: TValue) => boolean;
    fingerprint?: string;
  },
): Promise<ObservationResult<TValue>> {
  if (mayReadCache(options.cacheMode)) {
    const hit = await options.cache.get<Fingerprinted<TValue>>(options.key);
    if (hit !== undefined && hit.value.fingerprint === (options.fingerprint ?? "")) {
      return { value: hit.value.value, checkedAt: hit.checkedAt, age: hit.ageSeconds };
    }
  }
  const value = await options.retrieve();
  if (mayWriteCache(options.cacheMode) && options.cacheable(value)) {
    await options.cache.set(
      options.key,
      { value, fingerprint: options.fingerprint ?? "" },
      options.ttlSeconds,
      options.observedAt,
    );
  }
  return { value };
}

/**
 * 1.1 §12.3 — an encryption probe is stored only when the session actually said something about
 * encryption. A connection that never came up, a session cut short, a host the security check
 * refused and a deployment that cannot open the port are all absences of observation, and three
 * of the four would be wrong to keep across a change of configuration besides.
 */
export function starttlsIsObservation(outcome: StarttlsOutcome): boolean {
  return (
    outcome.kind === "SECURED" ||
    outcome.kind === "NOT_OFFERED" ||
    outcome.kind === "UPGRADE_FAILED"
  );
}
