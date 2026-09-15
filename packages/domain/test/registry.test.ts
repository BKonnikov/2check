import type { CheckFreshness } from "@2check/contracts";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_REGISTRY_TTL_SECONDS,
  evaluateRegistryLookup,
  normalizeRdapDomain,
  normalizeRegistrationStatus,
  parseWhoisRecord,
  registrationCacheTtlSeconds,
  resolveRegistryLookup,
} from "../src/registry.js";

const FRESHNESS: CheckFreshness = {
  checkedAt: "2026-09-15T00:00:00.000Z",
  cached: false,
  cacheAge: 0,
};

/** Shaped after a real .uz RDAP domain object. */
const RDAP_FIXTURE = {
  objectClassName: "domain",
  handle: "D-1",
  ldhName: "example.uz",
  unicodeName: "example.uz",
  status: ["active"],
  events: [
    { eventAction: "registration", eventDate: "2005-05-01T00:00:00Z" },
    { eventAction: "last changed", eventDate: "2025-01-16T00:00:00Z" },
    { eventAction: "expiration", eventDate: "2030-01-01T00:00:00Z" },
  ],
  nameservers: [{ ldhName: "ns.uz." }, { ldhName: "ns2.uz." }],
  entities: [
    {
      objectClassName: "entity",
      roles: ["registrar"],
      vcardArray: [
        "vcard",
        [
          ["version", {}, "text", "4.0"],
          ["fn", {}, "text", "UZINFOCOM"],
        ],
      ],
    },
    {
      objectClassName: "entity",
      roles: ["registrant"],
      vcardArray: [
        "vcard",
        [
          ["version", {}, "text", "4.0"],
          ["fn", {}, "text", "Example LLC"],
          ["email", {}, "text", "admin@example.uz"],
          ["adr", {}, "text", ["", "", "Amir Temur 1", "Tashkent", "", "100000", "UZ"]],
        ],
      ],
    },
  ],
};

describe("AC-9.4 — canonical lifecycle normalization", () => {
  it.each([
    [["active"], "ACTIVE"],
    [["ok"], "ACTIVE"],
    [["inactive"], "DEACTIVATED"],
    [["client hold"], "DEACTIVATED"],
    [["redemption period"], "REDEMPTION_PERIOD"],
    [["pending delete"], "CANCELLED"],
    [["pending create"], "REGISTRATION_INITIATED"],
    [["pending renew"], "PENDING_RENEWAL"],
    [["reserved"], "RESERVED"],
    [["auction"], "AUCTION"],
    [["free"], "FREE"],
    [["something the registry invented"], "UNKNOWN"],
    [[], "UNKNOWN"],
  ])("maps %j to %s", (raw, expected) => {
    expect(normalizeRegistrationStatus(raw)).toBe(expected);
  });

  it("describes a domain by its most specific status rather than by active", () => {
    expect(normalizeRegistrationStatus(["active", "redemption period"])).toBe("REDEMPTION_PERIOD");
  });
});

describe("PRD 9.4 — RDAP normalization", () => {
  const registration = normalizeRdapDomain(RDAP_FIXTURE, FRESHNESS);

  it("reads the registry domain, registrar, dates and nameservers", () => {
    expect(registration?.registryDomain).toBe("example.uz");
    expect(registration?.registrar).toBe("UZINFOCOM");
    expect(registration?.createdAt).toBe("2005-05-01T00:00:00Z");
    expect(registration?.expiresAt).toBe("2030-01-01T00:00:00Z");
    expect(registration?.nameServers).toEqual(["ns.uz", "ns2.uz"]);
  });

  it("keeps the provider's own wording in rawStatus", () => {
    expect(registration?.status).toBe("ACTIVE");
    expect(registration?.rawStatus).toEqual(["active"]);
  });

  it("marks a missing registrant field as unavailable rather than inventing one", () => {
    expect(registration?.registrant.phone).toEqual({ state: "unavailable" });
  });

  it("recognizes a value that the registry redacted in place", () => {
    const redacted = normalizeRdapDomain(
      {
        ...RDAP_FIXTURE,
        entities: [
          {
            roles: ["registrant"],
            vcardArray: ["vcard", [["fn", {}, "text", "REDACTED FOR PRIVACY"]]],
          },
        ],
      },
      FRESHNESS,
    );
    expect(redacted?.registrant.name).toEqual({ state: "redacted" });
  });

  it("honours an RFC 9537 redaction declaration", () => {
    const declared = normalizeRdapDomain(
      { ...RDAP_FIXTURE, redacted: [{ name: { type: "registrant email" } }] },
      FRESHNESS,
    );
    expect(declared?.registrant.email).toEqual({ state: "redacted" });
  });
});

describe("AC-9.5 — registrant values never travel in the result", () => {
  it("carries only field states", () => {
    const registration = normalizeRdapDomain(RDAP_FIXTURE, FRESHNESS);
    const serialized = JSON.stringify(registration);
    expect(serialized).not.toContain("admin@example.uz");
    expect(serialized).not.toContain("Amir Temur");
    expect(registration?.registrant.email).toEqual({ state: "value" });
    expect(Object.keys(registration?.registrant.name ?? {})).toEqual(["state"]);
  });
});

describe("AC-9.3 — an unusable answer is never read as a free domain", () => {
  it.each([[null], [undefined], ["<html>502</html>"], [{}], [{ status: ["active"] }]])(
    "returns null for %j",
    (payload) => {
      expect(normalizeRdapDomain(payload, FRESHNESS)).toBeNull();
    },
  );

  it("does not treat an unrecognized WHOIS layout as a confirmation", () => {
    const parsed = parseWhoisRecord("total garbage without any fields", FRESHNESS);
    expect(parsed.registration).toBeNull();
    expect(parsed.notFound).toBe(false);
  });

  it("resolves to INDETERMINATE when nothing was determinate", () => {
    const resolution = resolveRegistryLookup([
      { transport: "RDAP", registration: null, confirmedNotRegistered: false },
      { transport: "WHOIS", registration: null, confirmedNotRegistered: false },
    ]);
    expect(resolution.outcome).toBe("INDETERMINATE");
  });
});

describe("PRD 9.4 — WHOIS reading", () => {
  const whois = [
    "Domain Name: EXAMPLE.UZ",
    "Registrar: UZINFOCOM",
    "Creation Date: 2005-05-01",
    "Expiration Date: 2030-01-01",
    "Status: ACTIVE",
    "Name Server: ns.uz",
    "Name Server: ns2.uz",
    "Registrant Email: REDACTED FOR PRIVACY",
  ].join("\n");

  it("reads the common field layout", () => {
    const parsed = parseWhoisRecord(whois, FRESHNESS);
    expect(parsed.registration?.registryDomain).toBe("example.uz");
    expect(parsed.registration?.nameServers).toEqual(["ns.uz", "ns2.uz"]);
    expect(parsed.registration?.status).toBe("ACTIVE");
    expect(parsed.registration?.registrant.email).toEqual({ state: "redacted" });
  });

  it("recognizes an explicit not-found answer", () => {
    expect(parseWhoisRecord("No match for EXAMPLE.UZ", FRESHNESS).notFound).toBe(true);
  });
});

describe("AC-9.1 and AC-9.2 — transport strategy", () => {
  it("stops at RDAP when RDAP was determinate", () => {
    const resolution = resolveRegistryLookup([
      {
        transport: "RDAP",
        registration: normalizeRdapDomain(RDAP_FIXTURE, FRESHNESS),
        confirmedNotRegistered: false,
      },
      { transport: "WHOIS", registration: null, confirmedNotRegistered: false },
    ]);
    expect(resolution.outcome).toBe("REGISTERED");
    expect(resolution.transportsUsed).toEqual(["RDAP"]);
  });

  it("falls back to WHOIS only after RDAP was indeterminate", () => {
    const resolution = resolveRegistryLookup([
      { transport: "RDAP", registration: null, confirmedNotRegistered: false },
      {
        transport: "WHOIS",
        registration: parseWhoisRecord("Domain Name: example.uz\nStatus: ACTIVE", FRESHNESS)
          .registration,
        confirmedNotRegistered: false,
      },
    ]);
    expect(resolution.outcome).toBe("REGISTERED");
    expect(resolution.transportsUsed).toEqual(["RDAP", "WHOIS"]);
  });

  it("reports NOT_REGISTERED only on an explicit confirmation", () => {
    const resolution = resolveRegistryLookup([
      { transport: "RDAP", registration: null, confirmedNotRegistered: false },
      { transport: "WHOIS", registration: null, confirmedNotRegistered: true },
    ]);
    expect(resolution.outcome).toBe("NOT_REGISTERED");
  });
});

describe("AC-9.6 and AC-9.8 — the registry check", () => {
  const options = {
    registryDomain: "example.uz",
    registryProvider: "UzRegistryProvider",
    supported: true,
    freshness: FRESHNESS,
  };

  it("passes on a registered domain and names its target and source", () => {
    const check = evaluateRegistryLookup(
      {
        outcome: "REGISTERED",
        registration: normalizeRdapDomain(RDAP_FIXTURE, FRESHNESS),
        transportsUsed: ["RDAP"],
      },
      options,
    );
    expect(check.status).toBe("PASS");
    expect(check.target).toEqual({ kind: "REGISTRY_DOMAIN", registryDomain: "example.uz" });
    expect(check.source).toEqual({
      kind: "REGISTRY_PROVIDER",
      registryProvider: "UzRegistryProvider",
      transportsUsed: ["RDAP"],
    });
  });

  it("fails only on a confirmed absence", () => {
    const check = evaluateRegistryLookup(
      { outcome: "NOT_REGISTERED", registration: null, transportsUsed: ["RDAP"] },
      options,
    );
    expect(check.status).toBe("FAIL");
    expect(check.severity).toBe("critical");
  });

  it("is UNKNOWN with its own reason when the lookup was indeterminate", () => {
    const check = evaluateRegistryLookup(
      { outcome: "INDETERMINATE", registration: null, transportsUsed: ["RDAP", "WHOIS"] },
      options,
    );
    expect(check.status).toBe("UNKNOWN");
    expect(check.reasonCode).toBe("registry_lookup_indeterminate");
  });

  it("answers provider_not_supported outside .uz, with no source and no severity", () => {
    const check = evaluateRegistryLookup(
      { outcome: "INDETERMINATE", registration: null, transportsUsed: [] },
      { ...options, registryDomain: "example.com", supported: false },
    );
    expect(check.status).toBe("UNKNOWN");
    expect(check.reasonCode).toBe("provider_not_supported");
    expect(check.severity).toBe("none");
    expect(check.source).toBeUndefined();
  });
});

describe("AC-9.7 — status-aware cache lifetime", () => {
  it("caches an active registration in hours and a redemption period in minutes", () => {
    expect(registrationCacheTtlSeconds("ACTIVE")).toBeGreaterThanOrEqual(3600);
    expect(registrationCacheTtlSeconds("REDEMPTION_PERIOD")).toBeLessThanOrEqual(600);
    expect(registrationCacheTtlSeconds("PENDING_RENEWAL")).toBeLessThanOrEqual(600);
  });

  it("covers every canonical status", () => {
    expect(Object.keys(DEFAULT_REGISTRY_TTL_SECONDS)).toHaveLength(11);
  });
});
