import type {
  CategoryResult,
  CheckFreshness,
  EmailPolicyKind,
  ScanCategory,
  TlsIpFamily,
} from "@2check/contracts";
import {
  analyseDkim,
  analyseDmarc,
  analyseMailServer,
  analysePtr,
  analyseSpf,
  analyseStarttls,
  buildCategoryResult,
  buildEmailPolicyCacheKey,
  buildMailHostCacheKey,
  dkimSelectors,
  dmarcPolicyName,
  EMAIL_CACHE_TTL_SECONDS,
  evaluateDkimCheck,
  evaluateDmarcChecks,
  evaluateMailServerCheck,
  evaluatePtrChecks,
  evaluateSpfChecks,
  evaluateStarttlsChecks,
  type HostObservation,
  ipFamilyOf,
  type MailHostObservationKind,
  type MailServerAnalysis,
  PTR_MAX_ADDRESSES_PER_FAMILY,
  type PtrForwardObservation,
  type PtrObservation,
  STARTTLS_MAX_HOSTS,
  type StarttlsOutcome,
  validateTarget,
} from "@2check/domain";
import type { ReusableCache } from "../cache/reusable-cache.js";
import { createDkimLookup, type DkimLookupPort } from "../email/dkim-lookup.js";
import { createDmarcLookup, type DmarcLookupPort } from "../email/dmarc-lookup.js";
import {
  createMailHostLookup,
  MAX_MAIL_HOSTS,
  type MailHostPort,
  type ReverseObservation,
} from "../email/mail-host-lookup.js";
import {
  cacheObservation,
  cachePolicyWalk,
  starttlsIsObservation,
} from "../email/observation-cache.js";
import { probeMailHost } from "../email/smtp-prober.js";
import { createSpfLookup, type SpfLookupPort } from "../email/spf-lookup.js";
import type { Metrics } from "../observability/metrics.js";
import type { ScanRecord } from "./store.js";

/**
 * The mail category, in one place.
 *
 * It has six checks reading five kinds of observation through four ports, and 1.1 §12 gives it a
 * cache of its own with two key shapes. Keeping that beside the other categories in the
 * orchestrator would have buried the one thing worth reading in it: which observation each check
 * rests on, and when that observation was made.
 */

/** 1.1 §3.2 — the policy and the names it leads to; injectable so tests read fixtures. */
export type SpfLookupFactory = () => SpfLookupPort;
/** 1.1 §4.3 — the policy name and the names above it, walked once per scan. */
export type DmarcLookupFactory = () => DmarcLookupPort;
/** 1.1 §5.2 — one name per selector, from the request and from the recognised service. */
export type DkimLookupFactory = () => DkimLookupPort;
/** 1.1 §6.2 — the MX records, the addresses of the hosts they name, and their reverse names. */
export type MailHostFactory = () => MailHostPort;
/** 1.1 §7.2 — one SMTP session against one validated, pinned address. */
export type SmtpProbe = (address: string, hostname: string) => Promise<StarttlsOutcome>;

export interface EmailCategoryDependencies {
  readonly spfLookup?: SpfLookupFactory;
  readonly dmarcLookup?: DmarcLookupFactory;
  readonly dkimLookup?: DkimLookupFactory;
  readonly mailHostLookup?: MailHostFactory;
  readonly smtpProbe?: SmtpProbe;
  /** 1.1 §7.6 — whether this deployment can open outbound SMTP at all. */
  readonly smtpProbeEnabled?: boolean;
  /** PRD 15.10 — addresses this deployment must not probe. */
  readonly internalInfrastructureDenylist?: readonly string[];
  /** 1.1 §16.3 — the category's counters. The outcome is a label; the host never is. */
  readonly metrics?: Pick<Metrics, "increment">;
}

/** 1.1 §14.2 — the DKIM selector belongs to the request, not to the domain or the deployment. */
export interface EmailCategoryInputs {
  readonly dkimSelector?: string;
}

/** When one observation was made, and whether it came back from the cache. */
interface Observed {
  readonly checkedAt: string;
  readonly age: number;
  readonly cached: boolean;
}

const CATEGORY: ScanCategory = "email";

/**
 * 1.1 §12.4 — a result made of several observations is no fresher than its oldest part, so the
 * time reported is the earliest of them and the age the largest. A result with no cached part
 * reports the scan's own moment and no age at all.
 */
function freshnessOf(parts: readonly Observed[], now: string): CheckFreshness {
  if (!parts.some((part) => part.cached)) {
    return { checkedAt: now, cached: false, cacheAge: 0 };
  }
  return {
    checkedAt: [...parts.map((part) => part.checkedAt)].sort()[0] ?? now,
    cached: true,
    cacheAge: Math.max(...parts.map((part) => part.age)),
  };
}

function observed(
  result: { readonly checkedAt?: string; readonly age?: number },
  now: string,
): Observed {
  return result.age === undefined
    ? { checkedAt: now, age: 0, cached: false }
    : { checkedAt: result.checkedAt ?? now, age: result.age, cached: true };
}

/**
 * 1.1 §7.3 and §13.2 — the hosts to probe, each one taken through 1.0 §15 before it is touched.
 *
 * The security sequence is the one the TLS category already follows, applied to a mail host: the
 * host's whole address set is validated without truncation, and a single forbidden address blocks
 * the host rather than being dropped so the rest can be used. What the probe then connects to is
 * the validated address itself, so the name is never resolved a second time.
 *
 * Only the first four hosts are probed. The rest are reported as not probed, because the scan
 * budget is one for every category — §13.6 — and a host waiting for time that will not come is
 * worse than a result that says plainly which hosts it covers.
 */
async function probeMailHosts(
  record: ScanRecord,
  mail: MailServerAnalysis,
  deps: EmailCategoryDependencies,
  cached: (
    host: string,
    addresses: readonly string[],
    retrieve: () => Promise<StarttlsOutcome>,
  ) => Promise<{ value: StarttlsOutcome; observed: Observed }>,
): Promise<{
  probes: readonly StarttlsOutcome[];
  skipped: readonly string[];
  parts: readonly Observed[];
}> {
  const usable = mail.hosts.filter((host) => host.addresses.length > 0);
  const chosen = usable.slice(0, STARTTLS_MAX_HOSTS);
  const skipped = usable.slice(STARTTLS_MAX_HOSTS).map((host) => host.hostname);
  if (chosen.length === 0) {
    return { probes: [], skipped, parts: [] };
  }
  if (deps.smtpProbeEnabled !== true) {
    // §7.6 — a limit of the deployment, said once for every host rather than discovered per host.
    return {
      probes: chosen.map((host) => ({ kind: "UNAVAILABLE" as const, hostname: host.hostname })),
      skipped,
      parts: [],
    };
  }

  const probe = deps.smtpProbe ?? probeMailHost;
  const policy = {
    policyVersion: record.executionContext.securityPolicyVersion,
    ...(deps.internalInfrastructureDenylist === undefined
      ? {}
      : { internalInfrastructureDenylist: deps.internalInfrastructureDenylist }),
  };
  const probes: StarttlsOutcome[] = [];
  const parts: Observed[] = [];
  for (const host of chosen) {
    const result = await cached(host.hostname, host.addresses, async () => {
      const validation = validateTarget(host.addresses, policy);
      if (validation.decision !== "ALLOW") {
        deps.metrics?.increment("email_smtp_probe_blocked_total", {
          decision: validation.decision,
        });
        return {
          kind: "BLOCKED",
          hostname: host.hostname,
          reasonCode: validation.reasonCode ?? "security_validation_incomplete",
        };
      }
      const address = [...host.addresses].sort()[0];
      if (address === undefined) {
        return { kind: "CONNECT_FAILED", hostname: host.hostname };
      }
      const outcome = await probe(address, host.hostname);
      deps.metrics?.increment("email_smtp_probe_total", { outcome: outcome.kind });
      return outcome;
    });
    probes.push(result.value);
    parts.push(result.observed);
  }
  return { probes, skipped, parts };
}

/**
 * 1.1 §8.1 — the reverse names of the addresses the receiving hosts answer at.
 *
 * Only the hosts' own addresses are asked about, and only a couple per family: §8.3 wants both
 * families looked at, so the bound is per family rather than shared, and each address costs a
 * reverse query plus a forward one to confirm it against the shared scan budget.
 */
async function reverseNames(
  mail: MailServerAnalysis,
  port: MailHostPort,
  reverseOf: (
    address: string,
    retrieve: () => Promise<ReverseObservation>,
  ) => Promise<{ value: ReverseObservation; observed: Observed }>,
  forwardOf: (name: string) => Promise<{ value: HostObservation; observed: Observed }>,
): Promise<{
  reverse: readonly PtrObservation[];
  forward: readonly PtrForwardObservation[];
  parts: readonly Observed[];
}> {
  const budget: Record<string, number> = { IPV4: 0, IPV6: 0 };
  const chosen: { address: string; hostname: string }[] = [];
  for (const host of mail.hosts) {
    for (const address of host.addresses) {
      const family = ipFamilyOf(address);
      if ((budget[family] ?? 0) >= PTR_MAX_ADDRESSES_PER_FAMILY) {
        continue;
      }
      budget[family] = (budget[family] ?? 0) + 1;
      chosen.push({ address, hostname: host.hostname });
    }
  }
  if (chosen.length === 0) {
    return { reverse: [], forward: [], parts: [] };
  }

  const parts: Observed[] = [];
  const answers = await Promise.all(
    chosen.map((entry) => reverseOf(entry.address, () => port.reverse(entry.address))),
  );
  const reverse: PtrObservation[] = chosen.map((entry, index) => {
    const answer = answers[index];
    if (answer !== undefined) {
      parts.push(answer.observed);
    }
    return {
      address: entry.address,
      hostname: entry.hostname,
      outcome: answer?.value.outcome ?? "INDETERMINATE",
      ...(answer?.value.names === undefined ? {} : { names: answer.value.names }),
    };
  });

  const names = [...new Set(reverse.flatMap((entry) => entry.names ?? []))];
  const resolved = await Promise.all(names.map((name) => forwardOf(name)));
  const forward: PtrForwardObservation[] = names.map((name, index) => {
    const entry = resolved[index];
    if (entry !== undefined) {
      parts.push(entry.observed);
    }
    const observation = entry?.value;
    return {
      name,
      outcome: observation?.outcome ?? "INDETERMINATE",
      ...(observation?.addresses === undefined ? {} : { addresses: observation.addresses }),
      ...(observation?.alias === true ? { alias: true } : {}),
    };
  });
  return { reverse, forward, parts };
}

export async function runEmailCategory(
  record: ScanRecord,
  deps: EmailCategoryDependencies,
  inputs: EmailCategoryInputs,
  cache: ReusableCache,
): Promise<CategoryResult> {
  const domain = record.canonicalDomain.asciiHostname;
  const context = record.executionContext;
  const now = new Date().toISOString();
  const cacheMode = record.cacheMode;
  /**
   * 1.1 §12.1 — every mail key carries this version, so a change to the selector table, the
   * recognised services or this category's rules cannot reuse a result that meant something
   * else. A record stored before the field existed reads back without it.
   */
  const emailModuleConfigVersion = context.emailModuleConfigVersion ?? "slice-1";
  const shared = { emailModuleConfigVersion, cacheContractVersion: context.cacheContractVersion };

  const policyWalk = (policy: EmailPolicyKind, selector?: string) => ({
    cache,
    cacheMode,
    observedAt: now,
    ttlSeconds: EMAIL_CACHE_TTL_SECONDS.policy,
    key: buildEmailPolicyCacheKey({
      asciiHostname: domain,
      policy,
      ...(selector === undefined ? {} : { selector }),
      resolverSetVersion: context.resolverSetVersion,
      ...shared,
    }),
  });
  const hostKey = (
    mailHost: string,
    observation: MailHostObservationKind,
    ipFamily?: TlsIpFamily,
  ) =>
    buildMailHostCacheKey({
      mailHost,
      observation,
      ...(ipFamily === undefined ? {} : { ipFamily }),
      ...shared,
    });

  // 1.1 §3 — the domain's own record comes through the same port as the names it leads to, so a
  // cached walk is replayed whole, the root record included.
  const spfPort = (deps.spfLookup ?? createSpfLookup)();
  const spfCache = cachePolicyWalk(spfPort.lookup, policyWalk("SPF"));
  const spf = await analyseSpf({
    domain,
    answer: await spfCache.lookup(domain),
    lookup: spfCache.lookup,
  });
  await spfCache.commit();
  const spfFresh = freshnessOf([observed(spfCache.observed(), now)], now);

  /**
   * 1.1 §6 — the MX records, then the addresses of the hosts they name. A host's addresses are
   * keyed by the host, not by the domain that named it: a zone pointing at a large provider is
   * the common case, and the addresses are a fact about the provider's host.
   */
  const mailPort = (deps.mailHostLookup ?? createMailHostLookup)();
  const mailParts: Observed[] = [];
  const addressesOf = async (name: string) => {
    const entry = await cacheObservation<HostObservation>({
      cache,
      cacheMode,
      observedAt: now,
      key: hostKey(name, "addresses"),
      ttlSeconds: EMAIL_CACHE_TTL_SECONDS.mailHost,
      retrieve: () => mailPort.addresses(name),
      cacheable: (value) => value.outcome !== "INDETERMINATE",
    });
    return { value: entry.value, observed: observed(entry, now) };
  };

  const mxEntry = await cacheObservation({
    cache,
    cacheMode,
    observedAt: now,
    key: hostKey(domain, "mx"),
    ttlSeconds: EMAIL_CACHE_TTL_SECONDS.mailHost,
    retrieve: () => mailPort.mx(domain),
    cacheable: (value) => value.outcome !== "INDETERMINATE",
  });
  const mx = mxEntry.value;
  mailParts.push(observed(mxEntry, now));

  const named = (mx.records ?? [])
    .filter((entry) => entry.exchange.trim() !== "" && entry.exchange.trim() !== ".")
    .slice(0, MAX_MAIL_HOSTS)
    .map((entry) => entry.exchange);
  const [domainAddresses, ...hostEntries] = await Promise.all([
    addressesOf(domain),
    ...named.map((name) => addressesOf(name)),
  ]);
  for (const entry of [domainAddresses, ...hostEntries]) {
    if (entry !== undefined) {
      mailParts.push(entry.observed);
    }
  }
  const mail = analyseMailServer({
    domain,
    mx,
    domainAddresses: domainAddresses?.value ?? { hostname: domain, outcome: "INDETERMINATE" },
    hosts: hostEntries.map((entry) => entry.value),
  });

  /**
   * 1.1 §4.3 — the domain's own policy, and failing that the one it inherits. Whether the name
   * exists in DNS decides between the `sp` and `np` tags of an inherited record, and the MX query
   * above has already established it: any answer other than a missing name means the name is
   * there.
   */
  const dmarcPort = (deps.dmarcLookup ?? createDmarcLookup)();
  const dmarcCache = cachePolicyWalk(dmarcPort.lookup, policyWalk("DMARC"));
  const dmarc = await analyseDmarc({
    domain,
    answer: await dmarcCache.lookup(dmarcPolicyName(domain)),
    lookup: dmarcCache.lookup,
    ...(mx.outcome === "INDETERMINATE" ? {} : { domainExists: mx.outcome !== "NAME_NOT_FOUND" }),
  });
  // §12.3 — a walk that did not finish is stored as nothing; the port's own answers already say
  // so, since an indeterminate answer keeps the set out of the cache.
  await dmarcCache.commit();
  const dmarcFresh = freshnessOf([observed(dmarcCache.observed(), now)], now);

  /**
   * 1.1 §5.2 — the selector the caller gave, then the ones the service recognised from the MX
   * records is documented to publish keys under. The selector is part of the key, so a request
   * that named one can never answer a request that did not — AC-12.3.
   */
  const dkimPort = (deps.dkimLookup ?? createDkimLookup)();
  const selectors = dkimSelectors({
    provided: inputs.dkimSelector,
    service: mail.recognisedService?.dkimSelectors,
  });
  const dkimCache = cachePolicyWalk(
    dkimPort.lookup,
    policyWalk("DKIM", selectors.map((entry) => entry.selector).join(",")),
  );
  const dkim = await analyseDkim({ domain, selectors, lookup: dkimCache.lookup });
  await dkimCache.commit();
  const dkimFresh = freshnessOf([observed(dkimCache.observed(), now)], now);
  if (dkim.state === "NOT_FOUND" || dkim.state === "NOTHING_TO_ASK") {
    // 1.1 §16.3 — read against the total number of checks, it measures how well the selector
    // table covers the providers this market actually uses.
    deps.metrics?.increment("email_dkim_selector_unknown_total");
  }

  const probed = await probeMailHosts(record, mail, deps, async (host, addresses, retrieve) => {
    const entry = await cacheObservation<StarttlsOutcome>({
      cache,
      cacheMode,
      observedAt: now,
      key: hostKey(host, "starttls"),
      ttlSeconds: EMAIL_CACHE_TTL_SECONDS.smtpProbe,
      retrieve,
      cacheable: starttlsIsObservation,
      /**
       * PRD 14.6 — the observation belongs to the host, but it was made against the addresses the
       * host had then. A host that now answers at different addresses is not the host that was
       * probed, so the stored session is not an observation of it.
       */
      fingerprint: [...addresses].sort().join("|"),
    });
    return { value: entry.value, observed: observed(entry, now) };
  });
  const starttls = analyseStarttls({
    domain,
    probes: probed.probes,
    skipped: probed.skipped,
  });

  const reversed = await reverseNames(
    mail,
    mailPort,
    async (address, retrieve) => {
      const entry = await cacheObservation<ReverseObservation>({
        cache,
        cacheMode,
        observedAt: now,
        key: hostKey(address, "reverse", ipFamilyOf(address)),
        ttlSeconds: EMAIL_CACHE_TTL_SECONDS.mailHost,
        retrieve,
        cacheable: (value) => value.outcome !== "INDETERMINATE",
      });
      return { value: entry.value, observed: observed(entry, now) };
    },
    addressesOf,
  );
  const ptr = analysePtr({ reverse: reversed.reverse, forward: reversed.forward });

  // 1.1 §2.1 — the groups in the order the section lists them.
  const mailFresh = freshnessOf(mailParts, now);
  return buildCategoryResult(CATEGORY, [
    ...evaluateSpfChecks(spf, { domain, freshness: spfFresh }),
    ...evaluateDmarcChecks(dmarc, { domain, freshness: dmarcFresh }),
    evaluateDkimCheck(dkim, { domain, freshness: dkimFresh }),
    evaluateMailServerCheck(mail, { domain, freshness: mailFresh }),
    /**
     * 1.1 §2.3 and §15.5 — the receiving-server state travels with these two, because what
     * blocked them is in `blockedBy` while *why* has to be in the message: a domain that refuses
     * mail and one whose records name no server read alike otherwise.
     */
    ...evaluateStarttlsChecks(starttls, {
      domain,
      freshness: freshnessOf([...mailParts, ...probed.parts], now),
      receivingServer: mail.state,
    }),
    ...evaluatePtrChecks(ptr, {
      domain,
      freshness: freshnessOf([...mailParts, ...reversed.parts], now),
      receivingServer: mail.state,
    }),
  ]);
}
