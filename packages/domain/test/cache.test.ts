import { describe, expect, it } from "vitest";
import {
  buildDnsCacheKey,
  buildRegistryCacheKey,
  buildTlsCacheKey,
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
