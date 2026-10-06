import { describe, expect, it } from "vitest";
import {
  buildDnsCacheKey,
  buildEmailPolicyCacheKey,
  buildMailHostCacheKey,
  buildRegistryCacheKey,
  buildTlsCacheKey,
  EMAIL_CACHE_TTL_SECONDS,
  isTlsEntryReusable,
  mayReadCache,
  mayWriteCache,
  singleFlightKey,
  withPreviousResult,
} from "../src/cache.js";

const FRESHNESS = { checkedAt: "2026-09-15T00:00:00.000Z", cached: true, cacheAge: 42 };

describe("PRD 14.5 — technical cache keys", () => {
  const dns = {
    asciiHostname: "example.uz",
    resolverSetVersion: "r1",
    dnsModuleConfigVersion: "d1",
    cacheContractVersion: "c1",
  };

  it("includes the cache contract and module configuration versions", () => {
    expect(buildDnsCacheKey(dns)).toBe("dns|example.uz|r1|d1|c1");
  });

  it.each([
    ["resolverSetVersion", { ...dns, resolverSetVersion: "r2" }],
    ["dnsModuleConfigVersion", { ...dns, dnsModuleConfigVersion: "d2" }],
    ["cacheContractVersion", { ...dns, cacheContractVersion: "c2" }],
  ])("changes when %s changes", (_name, changed) => {
    expect(buildDnsCacheKey(changed)).not.toBe(buildDnsCacheKey(dns));
  });

  it("AC-14.5 — language is not part of the key", () => {
    const key = buildDnsCacheKey(dns);
    for (const language of ["ru", "uz", "en"]) {
      expect(key).not.toContain(language.toUpperCase());
    }
    expect(key.split("|")).toHaveLength(5);
  });

  it("AC-14.6 — the registry key uses registryModuleConfigVersion", () => {
    expect(
      buildRegistryCacheKey({
        registryDomain: "example.uz",
        registryProvider: "UzRegistryProvider",
        registryModuleConfigVersion: "m1",
        cacheContractVersion: "c1",
      }),
    ).toBe("registry|example.uz|UzRegistryProvider|m1|c1");
  });

  it("keys TLS by host, port, module, trust store and contract", () => {
    expect(
      buildTlsCacheKey({
        asciiHostname: "example.uz",
        port: 443,
        tlsModuleConfigVersion: "t1",
        trustStoreVersion: "s1",
        cacheContractVersion: "c1",
      }),
    ).toBe("tls|example.uz|443|t1|s1|c1");
  });
});

describe("AC-14.7 — the TLS dependency fingerprint is metadata, not a key", () => {
  const stable = {
    asciiHostname: "example.uz",
    port: 443,
    tlsModuleConfigVersion: "t1",
    trustStoreVersion: "s1",
    cacheContractVersion: "c1",
  };

  it("keeps the key stable regardless of the fingerprint", () => {
    expect(buildTlsCacheKey(stable)).not.toContain("fingerprint");
  });

  it("permits reuse only when the current fingerprint matches", () => {
    const entry = { result: "cached", dependencyFingerprint: "1.2.3.4", freshness: FRESHNESS };
    expect(isTlsEntryReusable(entry, "1.2.3.4")).toBe(true);
    expect(isTlsEntryReusable(entry, "1.2.3.4|5.6.7.8")).toBe(false);
    expect(isTlsEntryReusable(undefined, "1.2.3.4")).toBe(false);
  });
});

describe("AC-14.2 — FORCE_REFRESH is not a flush", () => {
  it("bypasses the read but still writes the new result", () => {
    expect(mayReadCache("NORMAL")).toBe(true);
    expect(mayReadCache("FORCE_REFRESH")).toBe(false);
    expect(mayWriteCache("FORCE_REFRESH")).toBe(true);
    expect(mayWriteCache("NORMAL")).toBe(true);
  });
});

describe("AC-14.8 — single-flight never merges scan identities", () => {
  it("coalesces on the technical key alone", () => {
    const key = buildDnsCacheKey({
      asciiHostname: "example.uz",
      resolverSetVersion: "r1",
      dnsModuleConfigVersion: "d1",
      cacheContractVersion: "c1",
    });
    expect(singleFlightKey(key)).toBe(`inflight|${key}`);
    expect(singleFlightKey(key)).not.toContain("scan");
  });
});

describe("AC-14.4 — a stale success never hides the current result", () => {
  it("reports the current attempt and offers the previous one separately", () => {
    const outcome = withPreviousResult("UNKNOWN", { result: "PASS", freshness: FRESHNESS });
    expect(outcome.current).toBe("UNKNOWN");
    expect(outcome.previous?.result).toBe("PASS");
    expect(outcome.previous?.freshness.cached).toBe(true);
  });

  it("offers nothing previous when there is nothing stale", () => {
    expect(withPreviousResult("PASS", undefined).previous).toBeUndefined();
  });
});

/**
 * 1.1 §12.1 — the keys of the mail category.
 *
 * The selector and the kind of observation are in the key because leaving either out would let
 * one answer stand in for another: a key without the selector would show one domain's DKIM key
 * under a selector it was not published for, and a key without the kind would let a host's
 * addresses answer a question about its reverse names.
 */
describe("1.1 §12.1 — mail cache keys", () => {
  const versions = { emailModuleConfigVersion: "e1", cacheContractVersion: "c1" } as const;
  const policy = { asciiHostname: "example.uz", resolverSetVersion: "r1", ...versions } as const;

  it("AC-12.1 — separates one selector from another", () => {
    const mine = buildEmailPolicyCacheKey({ ...policy, policy: "DKIM", selector: "mine" });
    const other = buildEmailPolicyCacheKey({ ...policy, policy: "DKIM", selector: "other" });
    expect(mine).not.toBe(other);
  });

  it("AC-12.3 — a request that named a selector cannot answer one that did not", () => {
    expect(buildEmailPolicyCacheKey({ ...policy, policy: "DKIM", selector: "mine" })).not.toBe(
      buildEmailPolicyCacheKey({ ...policy, policy: "DKIM" }),
    );
  });

  it("separates the three policies of one domain", () => {
    const keys = (["SPF", "DMARC", "DKIM"] as const).map((kind) =>
      buildEmailPolicyCacheKey({ ...policy, policy: kind }),
    );
    expect(new Set(keys).size).toBe(3);
  });

  it("changes with the module configuration and with the resolver set", () => {
    const base = buildEmailPolicyCacheKey({ ...policy, policy: "SPF" });
    expect(
      buildEmailPolicyCacheKey({ ...policy, policy: "SPF", resolverSetVersion: "r2" }),
    ).not.toBe(base);
    expect(
      buildEmailPolicyCacheKey({ ...policy, policy: "SPF", emailModuleConfigVersion: "e2" }),
    ).not.toBe(base);
    expect(
      buildEmailPolicyCacheKey({ ...policy, policy: "SPF", cacheContractVersion: "c2" }),
    ).not.toBe(base);
  });

  it("keys a host by the host, so several domains naming it share one observation", () => {
    const forOne = buildMailHostCacheKey({
      mailHost: "aspmx.l.google.com",
      observation: "addresses",
      ...versions,
    });
    const forAnother = buildMailHostCacheKey({
      mailHost: "aspmx.l.google.com",
      observation: "addresses",
      ...versions,
    });
    expect(forOne).toBe(forAnother);
  });

  it("separates the kinds of observation about one host", () => {
    const keys = (["mx", "addresses", "reverse", "starttls"] as const).map((observation) =>
      buildMailHostCacheKey({ mailHost: "mail.example.uz", observation, ...versions }),
    );
    expect(new Set(keys).size).toBe(4);
  });

  it("separates the families of one address", () => {
    expect(
      buildMailHostCacheKey({
        mailHost: "203.0.113.5",
        observation: "reverse",
        ipFamily: "IPV4",
        ...versions,
      }),
    ).not.toBe(
      buildMailHostCacheKey({
        mailHost: "203.0.113.5",
        observation: "reverse",
        ipFamily: "IPV6",
        ...versions,
      }),
    );
  });

  it("carries exactly the parts the section names, and no language", () => {
    // AC-14.5 — the stored value is technical, so nothing presentational enters the key.
    expect(buildEmailPolicyCacheKey({ ...policy, policy: "DKIM", selector: "mine" })).toBe(
      "email.policy|example.uz|DKIM|mine|r1|e1|c1",
    );
    expect(
      buildMailHostCacheKey({ mailHost: "mail.example.uz", observation: "mx", ...versions }),
    ).toBe("email.host|mail.example.uz||mx|e1|c1");
  });

  it("1.1 §12.2 — keeps a probe longer than a policy, and both in hours", () => {
    expect(EMAIL_CACHE_TTL_SECONDS.policy).toBeGreaterThanOrEqual(3600);
    expect(EMAIL_CACHE_TTL_SECONDS.mailHost).toBeGreaterThanOrEqual(3600);
    expect(EMAIL_CACHE_TTL_SECONDS.smtpProbe).toBeGreaterThan(EMAIL_CACHE_TTL_SECONDS.policy);
  });
});
