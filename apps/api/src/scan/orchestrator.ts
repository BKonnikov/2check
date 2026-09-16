import { createHash } from "node:crypto";
import type {
  CategoryResult,
  DnsProviderResult,
  ExecutionContext,
  TlsExecutionMetadata,
} from "@2check/contracts";
import {
  addressEvidenceIsSufficient,
  buildCategoryResult,
  buildDeadlineChecks,
  buildDnsCacheKey,
  buildRegistryCacheKey,
  buildSummary,
  collectAddressCandidates,
  DEFAULT_ISSUE_GROUPS,
  dnsCacheTtlSeconds,
  evaluateNameExistence,
  evaluateRegistryLookup,
  evaluateResolveCheck,
  evaluateResolverConsistency,
  evaluateTlsBlockedChecks,
  evaluateTlsChecks,
  markServedFromCache,
  mayReadCache,
  mayWriteCache,
  registrationCacheTtlSeconds,
  resolveRegistryLookup,
  selectRepresentativeAddress,
  singleFlightKey,
  type TlsProbeOutcome,
  type TlsProbes,
  validateTarget,
} from "@2check/domain";
import {
  createInMemoryCache,
  createSingleFlight,
  type ReusableCache,
} from "../cache/reusable-cache.js";
import {
  DEFAULT_QTYPES,
  DEFAULT_RESOLVER_SET_VERSION,
  queryResolverSet,
} from "../dns/resolver-set.js";
import {
  isSupportedZone,
  lookupRegistration,
  REGISTRY_PROVIDER,
  type RegistryLookup,
} from "../registry/uz-provider.js";
import { probeEndpoint } from "../tls/prober.js";
import type { ScanRecord, ScanStore } from "./store.js";

/** Injectable so tests run against golden fixtures rather than the public internet (AC-26.2). */
export type DnsQuery = (qname: string) => Promise<readonly DnsProviderResult[]>;
export type TlsProbe = (
  address: string,
  hostname: string,
  family: "IPV4" | "IPV6",
) => Promise<TlsProbeOutcome>;

export interface ScanDependencies {
  readonly dnsQuery?: DnsQuery;
  readonly registryLookup?: RegistryLookup;
  readonly tlsProbe?: TlsProbe;
  /** PRD 14.1 — the reusable result cache. Absent means a private in-process cache. */
  readonly cache?: ReusableCache;
  readonly singleFlight?: <TValue>(key: string, retrieve: () => Promise<TValue>) => Promise<TValue>;
  /** PRD 22.2 — the budget for the whole scan, not for one provider call. */
  readonly scanDeadlineMs?: number;
  /** PRD 15.10 — addresses this deployment must not probe. */
  readonly internalInfrastructureDenylist?: readonly string[];
  /** PRD 21.3 — somewhere to say why a scan fell over, instead of swallowing the error. */
  readonly logger?: { error(details: Record<string, unknown>, message: string): void };
}

/**
 * PRD 22.3 — the per-operation timeouts are 3s for DNS, 6s for the registry and 8s per TLS
 * endpoint. Run one after another they can add up past what anyone will wait for, so the whole
 * scan gets a budget of its own.
 */
export const DEFAULT_SCAN_DEADLINE_MS = 30_000;

/** PRD 16.4 — pinned for the whole scan. */
/**
 * PRD 15.10 and AC-15.7 — the effective denylist is part of the security policy, so changing it
 * changes the version. A scan carries the version it ran under; without this, two scans made
 * under different rules would be indistinguishable afterwards.
 */
export function securityPolicyVersion(denylist: readonly string[] = []): string {
  if (denylist.length === 0) {
    return "slice-1";
  }
  const digest = createHash("sha256")
    .update([...denylist].sort().join(","))
    .digest("hex");
  return `slice-1+${digest.slice(0, 8)}`;
}

export function buildExecutionContext(denylist: readonly string[] = []): ExecutionContext {
  return {
    healthPolicyVersion: "slice-1",
    securityPolicyVersion: securityPolicyVersion(denylist),
    orchestrationConfigVersion: "slice-1",
    cacheContractVersion: "slice-1",
    resolverSetVersion: DEFAULT_RESOLVER_SET_VERSION,
    dnsModuleConfigVersion: "slice-1",
    registryModuleConfigVersion: "slice-1",
    tlsModuleConfigVersion: "slice-1",
    trustStoreVersion: "system-1",
  };
}

function freshnessNow() {
  return { checkedAt: new Date().toISOString(), cached: false, cacheAge: 0 };
}

function isIpv6(address: string): boolean {
  return address.includes(":");
}

/**
 * PRD 16.6 — the address-resolution barrier.
 * Every planned A/AAAA query reaches a terminal outcome, the candidate set is sealed, and only
 * then may security validation produce ALLOW (AC-16.5). Running this without a visible DNS
 * category is what AC-16.3 permits for a TLS-only PARTIAL scan.
 */
async function sealAddressCandidates(
  record: ScanRecord,
  results: readonly DnsProviderResult[],
  deps: ScanDependencies,
): Promise<readonly string[]> {
  const sealed = collectAddressCandidates(results);
  record.sealedDnsAddressCandidates = sealed;
  record.securityValidation = validateTarget(sealed, {
    policyVersion: record.executionContext.securityPolicyVersion,
    ...(deps.internalInfrastructureDenylist === undefined
      ? {}
      : { internalInfrastructureDenylist: deps.internalInfrastructureDenylist }),
  });
  return sealed;
}

export async function runScan(
  record: ScanRecord,
  store: ScanStore,
  deps: ScanDependencies = {},
): Promise<void> {
  record.executionState = "RUNNING";
  await store.save(record);

  const qname = record.canonicalDomain.asciiHostname;
  const context = record.executionContext;
  const dnsOptions = { qname, resolverSetVersion: context.resolverSetVersion };
  const cache = deps.cache ?? createInMemoryCache();
  const singleFlight = deps.singleFlight ?? createSingleFlight();

  let dnsResults: readonly DnsProviderResult[] | undefined;
  let dnsCacheAge: number | undefined;

  // PRD 14.5 — the technical key carries the cache contract and the module configuration versions.
  const dnsKey = buildDnsCacheKey({
    asciiHostname: qname,
    resolverSetVersion: context.resolverSetVersion,
    dnsModuleConfigVersion: context.dnsModuleConfigVersion,
    cacheContractVersion: context.cacheContractVersion,
  });

  const dnsOnce = async (): Promise<readonly DnsProviderResult[]> => {
    if (dnsResults !== undefined) {
      return dnsResults;
    }
    // PRD 14.2 — FORCE_REFRESH bypasses the read; it never clears anything.
    if (mayReadCache(record.cacheMode)) {
      const hit = await cache.get<DnsProviderResult[]>(dnsKey);
      if (hit !== undefined) {
        dnsCacheAge = hit.ageSeconds;
        dnsResults = hit.value;
        return hit.value;
      }
    }
    // PRD 14.7 — concurrent identical retrievals share one execution, keyed technically.
    const fresh = await singleFlight(singleFlightKey(dnsKey), () =>
      (deps.dnsQuery ?? queryResolverSet)(qname),
    );
    dnsResults = fresh;
    if (mayWriteCache(record.cacheMode)) {
      const observedAt = [...fresh.map((entry) => entry.receivedAt)].sort()[0];
      await cache.set(
        dnsKey,
        fresh,
        dnsCacheTtlSeconds(
          fresh.flatMap((entry) => entry.answers.map((answer) => answer.ttl ?? 0)),
        ),
        observedAt,
      );
    }
    return fresh;
  };

  const categories: CategoryResult[] = [];
  let thrown = false;

  const work = async (): Promise<void> => {
    for (const category of record.visibleCategories) {
      if (category === "dns") {
        const results = await dnsOnce();
        await sealAddressCandidates(record, results, deps);

        const checks = [evaluateNameExistence(results, dnsOptions)];
        for (const qtype of DEFAULT_QTYPES) {
          const forType = results.filter((entry) => entry.qtype === qtype);
          checks.push(evaluateResolveCheck(qtype, forType, dnsOptions));
          checks.push(evaluateResolverConsistency(qtype, forType, dnsOptions));
        }
        // AC-6.5 — checkedAt keeps the original observation; only cached and cacheAge change.
        categories.push(
          buildCategoryResult(
            "dns",
            dnsCacheAge === undefined ? checks : markServedFromCache(checks, dnsCacheAge),
          ),
        );
      }

      if (category === "registry") {
        // PRD 5.4 — registryDomain is the registry module's determination.
        const registryDomain =
          record.canonicalDomain.registrableDomain ?? record.canonicalDomain.asciiHostname;
        const supported = isSupportedZone(registryDomain);
        const registryKey = buildRegistryCacheKey({
          registryDomain,
          registryProvider: REGISTRY_PROVIDER,
          registryModuleConfigVersion: context.registryModuleConfigVersion,
          cacheContractVersion: context.cacheContractVersion,
        });

        let registryAge: number | undefined;
        // PRD 6.3 and AC-6.5 — checkedAt is when the registry was observed, not when the cache
        // was read. Without this a six-hour-old entry reports "checked just now, age 6 hours".
        let registryObservedAt: string | undefined;
        let resolution = {
          outcome: "INDETERMINATE" as const,
          registration: null,
          transportsUsed: [],
        } as Awaited<ReturnType<typeof resolveRegistryLookup>>;

        if (supported) {
          const hit = mayReadCache(record.cacheMode)
            ? await cache.get<typeof resolution>(registryKey)
            : undefined;
          if (hit !== undefined) {
            resolution = hit.value;
            registryAge = hit.ageSeconds;
            registryObservedAt = hit.checkedAt;
          } else {
            resolution = resolveRegistryLookup(
              await singleFlight(singleFlightKey(registryKey), () =>
                (deps.registryLookup ?? lookupRegistration)(registryDomain),
              ),
            );
            if (mayWriteCache(record.cacheMode)) {
              // PRD 9.7 — the lifetime follows the registration status.
              await cache.set(
                registryKey,
                resolution,
                registrationCacheTtlSeconds(resolution.registration?.status ?? "UNKNOWN"),
                resolution.registration?.freshness.checkedAt,
              );
            }
          }
        }

        const registryCheck = evaluateRegistryLookup(resolution, {
          registryDomain,
          registryProvider: REGISTRY_PROVIDER,
          supported,
          freshness:
            registryObservedAt === undefined
              ? freshnessNow()
              : { checkedAt: registryObservedAt, cached: false, cacheAge: 0 },
        });

        categories.push(
          buildCategoryResult(
            "registry",
            registryAge === undefined
              ? [registryCheck]
              : markServedFromCache([registryCheck], registryAge),
          ),
        );
      }

      if (category === "tls") {
        const results = await dnsOnce();
        const sealed = await sealAddressCandidates(record, results, deps);
        const tlsOptions = { hostname: qname, freshness: freshnessNow() };
        const decision = record.securityValidation?.decision ?? "INDETERMINATE";

        if (decision !== "ALLOW") {
          // PRD 15.7 — a security BLOCK is not a problem of the domain.
          categories.push(
            buildCategoryResult(
              "tls",
              evaluateTlsBlockedChecks(
                decision === "BLOCK" ? "ssrf_policy_block" : "security_validation_incomplete",
                tlsOptions,
              ),
            ),
          );
          continue;
        }

        /**
         * PRD 8.9 and AC-8.8 — insufficient agreement among the resolvers does not permit a TLS
         * connection, even when individual addresses were obtained. This is checked after the
         * security decision because a BLOCK is the more specific thing to report.
         */
        if (!addressEvidenceIsSufficient(results)) {
          categories.push(
            buildCategoryResult(
              "tls",
              evaluateTlsBlockedChecks("dns_quorum_not_reached", tlsOptions),
            ),
          );
          continue;
        }

        // PRD 10.2 — the representative endpoint per family, chosen by how many resolvers saw it.
        const observations = (address: string): number =>
          results.filter((entry) => entry.answers.some((answer) => answer.value === address))
            .length;
        const selectedIPv4 = selectRepresentativeAddress(
          sealed.filter((address) => !isIpv6(address)),
          observations,
        );
        const selectedIPv6 = selectRepresentativeAddress(sealed.filter(isIpv6), observations);

        const probe = deps.tlsProbe ?? probeEndpoint;
        const probes: TlsProbes = {
          IPV4:
            selectedIPv4 === undefined
              ? { kind: "ABSENT" }
              : await probe(selectedIPv4, qname, "IPV4"),
          IPV6:
            selectedIPv6 === undefined
              ? { kind: "ABSENT" }
              : await probe(selectedIPv6, qname, "IPV6"),
        };

        // PRD 19.4 — the minimal audit record of the TLS prerequisites.
        const metadata: TlsExecutionMetadata = {
          ...(selectedIPv4 === undefined ? {} : { selectedIPv4 }),
          ...(selectedIPv6 === undefined ? {} : { selectedIPv6 }),
          dependencyFingerprint: [...sealed].sort().join("|"),
          securityPolicyVersion: record.executionContext.securityPolicyVersion,
          tlsModuleConfigVersion: record.executionContext.tlsModuleConfigVersion,
          trustStoreVersion: record.executionContext.trustStoreVersion,
          resultSource: "FRESH",
        };
        record.tlsExecutionMetadata = metadata;

        categories.push(buildCategoryResult("tls", evaluateTlsChecks(probes, tlsOptions)));
      }
    }
  };

  /**
   * PRD 22.2 and AC-22.2 — an accepted scan may not stay RUNNING for ever, so the whole run has
   * a budget. Per-operation timeouts bound each provider call; this bounds their sum, which is
   * what a client waiting on the result actually experiences.
   */
  const budgetMs = deps.scanDeadlineMs ?? DEFAULT_SCAN_DEADLINE_MS;
  let deadlineExceeded = false;
  await Promise.race([
    work().catch((error: unknown) => {
      thrown = true;
      deps.logger?.error({ error: String(error) }, "scan orchestration failed");
    }),
    new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        deadlineExceeded = true;
        resolve();
      }, budgetMs);
      timer.unref?.();
    }),
  ]);

  /**
   * PRD 16.7 — a check the deadline interrupted is UNKNOWN with scan_deadline_exceeded, and the
   * scan stays COMPLETED with the reason recorded. What did finish is trustworthy and is kept.
   */
  const produced = [...categories];
  if (deadlineExceeded) {
    const freshness = freshnessNow();
    for (const category of record.visibleCategories) {
      if (produced.some((entry) => entry.category === category)) {
        continue;
      }
      produced.push(
        buildCategoryResult(
          category,
          category === "tls"
            ? evaluateTlsBlockedChecks("scan_deadline_exceeded", { hostname: qname, freshness })
            : buildDeadlineChecks(category, { hostname: qname, freshness }),
        ),
      );
    }
    record.completionReason = "DEADLINE_TERMINALIZED";
  }

  if (thrown && produced.length === 0) {
    // PRD 16.9 — FAILED only when no trustworthy final result can be produced.
    record.executionState = "FAILED";
    record.completedAt = new Date().toISOString();
    record.failure = { failureCode: "orchestration_error", occurredAt: new Date().toISOString() };
  } else {
    record.categories = produced;
    // PRD 16.8 — the deterministic server-side order: checks, categories, issues, confidence,
    // verdict, score. The client never assembles the authoritative result.
    record.summary = buildSummary(produced, {
      groups: DEFAULT_ISSUE_GROUPS,
      mode: record.mode,
      state: "FINAL",
    });
    record.executionState = "COMPLETED";
    record.completedAt = new Date().toISOString();
  }

  // AC-19.9 — the terminal snapshot is published in one write, after which it is immutable.
  await store.save(record);
}
