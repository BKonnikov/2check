import type { CacheMode, CheckFreshness } from "@2check/contracts";

/**
 * PRD 14.5 — technical cache keys.
 * Every key carries cacheContractVersion plus the module configuration versions that can change
 * the meaning of a stored result, so a configuration change cannot silently reuse stale semantics.
 * Language is deliberately absent (AC-14.5): the cached value is technical, not presentational.
 */
export interface DnsCacheKeyParts {
  readonly asciiHostname: string;
  readonly resolverSetVersion: string;
  readonly dnsModuleConfigVersion: string;
  readonly cacheContractVersion: string;
}

export interface RegistryCacheKeyParts {
  readonly registryDomain: string;
  readonly registryProvider: string;
  /** AC-14.6 — the canonical identifier, never providerConfigVersion. */
  readonly registryModuleConfigVersion: string;
  readonly cacheContractVersion: string;
}

export interface TlsCacheKeyParts {
  readonly asciiHostname: string;
  readonly port: number;
  readonly tlsModuleConfigVersion: string;
  readonly trustStoreVersion: string;
  readonly cacheContractVersion: string;
}

function joinKey(namespace: string, parts: readonly (string | number)[]): string {
  return [namespace, ...parts.map((part) => String(part))].join("|");
}

export function buildDnsCacheKey(parts: DnsCacheKeyParts): string {
  return joinKey("dns", [
    parts.asciiHostname,
    parts.resolverSetVersion,
    parts.dnsModuleConfigVersion,
    parts.cacheContractVersion,
  ]);
}

export function buildRegistryCacheKey(parts: RegistryCacheKeyParts): string {
  return joinKey("registry", [
    parts.registryDomain,
    parts.registryProvider,
    parts.registryModuleConfigVersion,
    parts.cacheContractVersion,
  ]);
}

export function buildTlsCacheKey(parts: TlsCacheKeyParts): string {
  return joinKey("tls", [
    parts.asciiHostname,
    parts.port,
    parts.tlsModuleConfigVersion,
    parts.trustStoreVersion,
    parts.cacheContractVersion,
  ]);
}

/**
 * PRD 14.6 and AC-14.7 — the dependency fingerprint is compatibility metadata stored beside the
 * result, not part of the stable key. A lookup hits the stable key first; reuse is only permitted
 * when the current DNS and security conditions still produce the same fingerprint.
 */
export interface TlsCacheEntry<TResult> {
  readonly result: TResult;
  readonly dependencyFingerprint: string;
  readonly freshness: CheckFreshness;
}

export function isTlsEntryReusable<TResult>(
  entry: TlsCacheEntry<TResult> | undefined,
  currentDependencyFingerprint: string,
): boolean {
  return entry !== undefined && entry.dependencyFingerprint === currentDependencyFingerprint;
}

/**
 * PRD 14.2 and AC-14.2 — FORCE_REFRESH bypasses the read and performs a fresh retrieval, then
 * writes the new result. It is not a flush: nothing else in the cache is discarded.
 */
export function mayReadCache(cacheMode: CacheMode): boolean {
  return cacheMode === "NORMAL";
}

export function mayWriteCache(_cacheMode: CacheMode): boolean {
  return true;
}

/**
 * PRD 14.7 and AC-14.8 — concurrent identical NORMAL requests may share one retrieval.
 * The coalescing key is the technical cache key; a scanId never takes part, so two scans are
 * never merged into one another's identity.
 */
export function singleFlightKey(cacheKey: string): string {
  return `inflight|${cacheKey}`;
}

/**
 * PRD 14.4 and AC-14.4 — a stale success never replaces a failed refresh.
 * The current attempt is what the result reports; anything previously known is offered separately
 * so the reader can see both without one masquerading as the other.
 */
export interface CurrentAndPrevious<TResult> {
  readonly current: TResult;
  readonly previous?: { readonly result: TResult; readonly freshness: CheckFreshness };
}

export function withPreviousResult<TResult>(
  current: TResult,
  stale: { readonly result: TResult; readonly freshness: CheckFreshness } | undefined,
): CurrentAndPrevious<TResult> {
  return stale === undefined ? { current } : { current, previous: stale };
}

/** PRD 14.8 — a transient UNKNOWN may be cached briefly; FORCE_REFRESH ignores such an entry. */
export const DEFAULT_TRANSIENT_FAILURE_TTL_SECONDS = 30;

/**
 * A conservative DNS cache lifetime: the shortest record TTL any resolver reported, clamped so a
 * hostile or careless zone cannot pin us to a one-second or a one-week reuse window. The bounds
 * are cache-contract configuration (PRD 20.3).
 */
export const DNS_CACHE_TTL_BOUNDS = { minimumSeconds: 60, maximumSeconds: 3600 } as const;

export function dnsCacheTtlSeconds(
  recordTtls: readonly number[],
  bounds: { minimumSeconds: number; maximumSeconds: number } = DNS_CACHE_TTL_BOUNDS,
): number {
  const positive = recordTtls.filter((ttl) => Number.isFinite(ttl) && ttl > 0);
  const shortest = positive.length === 0 ? bounds.minimumSeconds : Math.min(...positive);
  return Math.min(bounds.maximumSeconds, Math.max(bounds.minimumSeconds, shortest));
}

/**
 * PRD 6.3, 14.5 and AC-6.5 — a result served from cache keeps the time it was originally
 * observed; only `cached` and `cacheAge` describe the cache read itself.
 */
export function markServedFromCache<TCheck extends { readonly freshness: CheckFreshness }>(
  checks: readonly TCheck[],
  ageSeconds: number,
): TCheck[] {
  return checks.map((check) => ({
    ...check,
    freshness: { ...check.freshness, cached: true, cacheAge: ageSeconds },
  }));
}
