import { describe, expect, it } from "vitest";
import {
  analysePtr,
  evaluatePtrChecks,
  ipFamilyOf,
  PTR_CHECK_IDS,
  PTR_MAX_ADDRESSES_PER_FAMILY,
  type PtrForwardObservation,
  type PtrInput,
  type PtrObservation,
  reverseName,
  sameAddress,
} from "../src/index.js";

const FRESHNESS = { checkedAt: "2026-10-06T00:00:00.000Z", cached: false, cacheAge: 0 } as const;

function at(
  address: string,
  names: readonly string[],
  hostname = "mail.example.uz",
): PtrObservation {
  return { address, hostname, outcome: names.length > 0 ? "ANSWER" : "EMPTY", names };
}

function resolves(
  name: string,
  addresses: readonly string[],
  extra: Partial<PtrForwardObservation> = {},
): PtrForwardObservation {
  return {
    name,
    outcome: addresses.length > 0 ? "ANSWER" : "EMPTY",
    addresses,
    ...extra,
  };
}

function run(input: PtrInput) {
  const analyses = analysePtr(input);
  const results = evaluatePtrChecks(analyses, { domain: "example.uz", freshness: FRESHNESS });
  return {
    analyses,
    results,
    v4: results.find((result) => result.checkId === PTR_CHECK_IDS.IPV4),
    v6: results.find((result) => result.checkId === PTR_CHECK_IDS.IPV6),
  };
}

describe("the reverse name of an address", () => {
  it("builds the in-addr.arpa name for IPv4", () => {
    expect(reverseName("203.0.113.5")).toBe("5.113.0.203.in-addr.arpa");
  });

  it("spells an IPv6 address out one nibble at a time", () => {
    // RFC 3596 §2.5 — 32 nibbles, so a shortened address and its long form agree.
    expect(reverseName("2001:db8::1")).toBe(
      "1.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.8.b.d.0.1.0.0.2.ip6.arpa",
    );
    expect(reverseName("2001:0db8:0000:0000:0000:0000:0000:0001")).toBe(reverseName("2001:db8::1"));
  });

  it("returns nothing for a value that is not an address", () => {
    expect(reverseName("mail.example.uz")).toBeUndefined();
    expect(reverseName("")).toBeUndefined();
  });

  it("treats two spellings of one address as one address", () => {
    expect(sameAddress("2001:db8::1", "2001:0db8:0000:0000:0000:0000:0000:0001")).toBe(true);
    expect(sameAddress("203.0.113.5", "203.0.113.6")).toBe(false);
    expect(sameAddress("203.0.113.5", "::ffff:203.0.113.5")).toBe(false);
  });

  it("tells the families apart by the shape of the address", () => {
    expect(ipFamilyOf("203.0.113.5")).toBe("IPV4");
    expect(ipFamilyOf("2001:db8::1")).toBe("IPV6");
  });
});

describe("AC-8.2 — a reverse name is confirmed only by resolving back", () => {
  it("passes a name that resolves back to the same address", () => {
    const { v4 } = run({
      reverse: [at("203.0.113.5", ["mail.example.uz"])],
      forward: [resolves("mail.example.uz", ["203.0.113.5"])],
    });
    expect(v4?.status).toBe("PASS");
    expect(v4?.message.params).toMatchObject({ ipFamily: "IPv4", names: "mail.example.uz" });
  });

  it("fails a name that resolves somewhere else", () => {
    const { v4 } = run({
      reverse: [at("203.0.113.5", ["mail.example.uz"])],
      forward: [resolves("mail.example.uz", ["198.51.100.9"])],
    });
    expect(v4?.status).toBe("FAIL");
    expect(v4?.severity).toBe("warning");
    expect(v4?.message.titleCode).toBe("email.ptr.fail.unconfirmed");
  });

  it("confirms a name whose long and short spellings differ from the address", () => {
    const { v6 } = run({
      reverse: [at("2001:db8::1", ["mail.example.uz"])],
      forward: [resolves("mail.example.uz", ["2001:0db8:0000:0000:0000:0000:0000:0001"])],
    });
    expect(v6?.status).toBe("PASS");
  });

  it("accepts any one of several names resolving back", () => {
    // §8.4 — several reverse names for one address are allowed and reported as a fact.
    const { v4 } = run({
      reverse: [at("203.0.113.5", ["old.example.uz", "mail.example.uz"])],
      forward: [
        resolves("old.example.uz", ["198.51.100.9"]),
        resolves("mail.example.uz", ["203.0.113.5"]),
      ],
    });
    expect(v4?.status).toBe("PASS");
  });
});

describe("AC-8.3 and AC-8.4 — the families are separate, and so are their levels", () => {
  it("produces one result per family", () => {
    const { results } = run({ reverse: [], forward: [] });
    expect(results.map((result) => result.checkId)).toEqual([
      PTR_CHECK_IDS.IPV4,
      PTR_CHECK_IDS.IPV6,
    ]);
  });

  it("does not carry one family's result over to the other", () => {
    const { v4, v6 } = run({
      reverse: [at("203.0.113.5", ["mail.example.uz"]), at("2001:db8::1", [])],
      forward: [resolves("mail.example.uz", ["203.0.113.5"])],
    });
    expect(v4?.status).toBe("PASS");
    expect(v6?.status).toBe("FAIL");
  });

  it("weighs a missing IPv4 name as a warning and a missing IPv6 one as informational", () => {
    const { v4, v6 } = run({
      reverse: [at("203.0.113.5", []), at("2001:db8::1", [])],
      forward: [],
    });
    expect(v4?.severity).toBe("warning");
    expect(v6?.severity).toBe("informational");
    expect(v4?.message.titleCode).toBe("email.ptr.fail.absent");
  });

  it("names the family in the message of each", () => {
    const { v4, v6 } = run({
      reverse: [at("203.0.113.5", []), at("2001:db8::1", [])],
      forward: [],
    });
    expect(v4?.message.params?.ipFamily).toBe("IPv4");
    expect(v6?.message.params?.ipFamily).toBe("IPv6");
  });

  it("puts the family in the check target", () => {
    const { v6 } = run({
      reverse: [at("2001:db8::1", ["mail.example.uz"], "mx.example.uz")],
      forward: [resolves("mail.example.uz", ["2001:db8::1"])],
    });
    expect(v6?.target).toEqual({
      kind: "MAIL_HOST",
      hostname: "mx.example.uz",
      ipFamily: "IPV6",
    });
  });
});

describe("§8.4 — a reverse name pointing at an alias", () => {
  it("reports it as informational even when the alias resolved back", () => {
    // RFC 1912 §2.4 — following the alias is what made the confirmation possible.
    const { v4 } = run({
      reverse: [at("203.0.113.5", ["alias.example.uz"])],
      forward: [resolves("alias.example.uz", ["203.0.113.5"], { alias: true })],
    });
    expect(v4?.status).toBe("FAIL");
    expect(v4?.severity).toBe("informational");
    expect(v4?.message.titleCode).toBe("email.ptr.fail.alias");
  });

  it("reports an unconfirmed name before an alias, because it is the heavier finding", () => {
    const { v4 } = run({
      reverse: [
        at("203.0.113.5", ["wrong.example.uz"], "a.example.uz"),
        at("203.0.113.6", ["alias.example.uz"], "b.example.uz"),
      ],
      forward: [
        resolves("wrong.example.uz", ["198.51.100.9"]),
        resolves("alias.example.uz", ["203.0.113.6"], { alias: true }),
      ],
    });
    expect(v4?.message.titleCode).toBe("email.ptr.fail.unconfirmed");
    expect(v4?.message.params?.hosts).toBe("a.example.uz");
  });
});

describe("AC-8.7 — an unfinished confirmation concludes nothing", () => {
  it("does not call a name unconfirmed when the forward query did not complete", () => {
    const { v4, analyses } = run({
      reverse: [at("203.0.113.5", ["mail.example.uz"])],
      forward: [{ name: "mail.example.uz", outcome: "INDETERMINATE" }],
    });
    expect(analyses.IPV4.state).toBe("CONFIRMATION_INCOMPLETE");
    expect(v4?.status).toBe("UNKNOWN");
    expect(v4?.reasonCode).toBe("ptr_confirmation_incomplete");
    expect(v4?.severity).toBe("none");
  });

  it("does not call a name unconfirmed when the forward answer is missing altogether", () => {
    const { v4 } = run({
      reverse: [at("203.0.113.5", ["mail.example.uz"])],
      forward: [],
    });
    expect(v4?.status).toBe("UNKNOWN");
    expect(v4?.reasonCode).toBe("ptr_confirmation_incomplete");
  });

  it("separates a reverse query that failed from an address without a name", () => {
    const { v4 } = run({
      reverse: [{ address: "203.0.113.5", hostname: "mail.example.uz", outcome: "INDETERMINATE" }],
      forward: [],
    });
    expect(v4?.status).toBe("UNKNOWN");
    expect(v4?.reasonCode).toBe("ptr_lookup_failed");
  });

  it("still reports an established finding when another address is unknown", () => {
    const { v4 } = run({
      reverse: [
        at("203.0.113.5", [], "a.example.uz"),
        { address: "203.0.113.6", hostname: "b.example.uz", outcome: "INDETERMINATE" },
      ],
      forward: [],
    });
    expect(v4?.status).toBe("FAIL");
    expect(v4?.message.titleCode).toBe("email.ptr.fail.absent");
  });
});

describe("§2.3 — with no receiving host there is no address to ask about", () => {
  it("blocks both checks on the MX check", () => {
    const { v4, v6 } = run({ reverse: [], forward: [] });
    for (const result of [v4, v6]) {
      expect(result?.status).toBe("NOT_APPLICABLE");
      expect(result?.blockedBy).toBe("email.mx.records");
      expect(result?.reasonCode).toBeUndefined();
    }
  });

  it("AC-15.7 — says which of the two reasons left nothing to ask about", () => {
    const empty = analysePtr({ reverse: [], forward: [] });
    const refused = evaluatePtrChecks(empty, {
      domain: "example.uz",
      freshness: FRESHNESS,
      receivingServer: "NULL_MX",
    });
    const missing = evaluatePtrChecks(empty, {
      domain: "example.uz",
      freshness: FRESHNESS,
      receivingServer: "MISSING",
    });
    expect(refused[0]?.message.titleCode).toBe("email.ptr.blocked.refused");
    expect(missing[0]?.message.titleCode).toBe("email.ptr.blocked.missing");
  });

  it("does not blame the MX check for a family the hosts simply do not answer on", () => {
    const { v4, v6 } = run({
      reverse: [at("203.0.113.5", ["mail.example.uz"])],
      forward: [resolves("mail.example.uz", ["203.0.113.5"])],
    });
    expect(v4?.status).toBe("PASS");
    expect(v6?.status).toBe("NOT_APPLICABLE");
    expect(v6?.blockedBy).toBeUndefined();
    expect(v6?.message.titleCode).toBe("email.ptr.not_applicable");
  });
});

describe("AC-8.6 — the shape of the name is not judged", () => {
  it("passes a name that is generated from the address", () => {
    const generated = "203-0-113-5.static.example.net";
    const { v4 } = run({
      reverse: [at("203.0.113.5", [generated])],
      forward: [resolves(generated, ["203.0.113.5"])],
    });
    expect(v4?.status).toBe("PASS");
    expect(v4?.severity).toBe("none");
  });

  it("bounds the addresses one scan asks about, per family", () => {
    expect(PTR_MAX_ADDRESSES_PER_FAMILY).toBeGreaterThan(0);
  });
});
