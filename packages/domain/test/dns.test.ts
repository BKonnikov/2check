import type { DnsOutcome, DnsProviderResult, DnsQType } from "@2check/contracts";
import { describe, expect, it } from "vitest";
import {
  aggregateRecordState,
  collectAddressCandidates,
  deriveRecordState,
  evaluateNameExistence,
  evaluateResolveCheck,
  evaluateResolverConsistency,
} from "../src/dns.js";

const OPTIONS = { qname: "example.uz", resolverSetVersion: "test-1" } as const;

function answer(
  provider: string,
  qtype: DnsQType,
  outcome: DnsOutcome,
  values: readonly string[] = [],
): DnsProviderResult {
  return {
    provider,
    qname: "example.uz",
    qtype,
    transportStatus: "SUCCESS",
    rcode: outcome === "NXDOMAIN" ? "NXDOMAIN" : "NOERROR",
    outcome,
    answers: values.map((value) => ({ type: qtype, value, ttl: 300 })),
    authority: [],
    receivedAt: "2026-09-15T00:00:00.000Z",
  };
}

function failure(
  provider: string,
  qtype: DnsQType,
  transportStatus: DnsProviderResult["transportStatus"],
): DnsProviderResult {
  return {
    provider,
    qname: "example.uz",
    qtype,
    transportStatus,
    answers: [],
    authority: [],
    receivedAt: "2026-09-15T00:00:00.000Z",
  };
}

describe("AC-8.2 — NXDOMAIN and NODATA are distinct", () => {
  it("reads NODATA as an absent record on a name that exists", () => {
    expect(deriveRecordState(answer("google", "AAAA", "NODATA"))).toBe("ABSENT");
  });

  it("reads NXDOMAIN as a missing name", () => {
    expect(deriveRecordState(answer("google", "A", "NXDOMAIN"))).toBe("NAME_NOT_FOUND");
  });

  it("treats a transport failure as undetermined, not as an absence", () => {
    expect(deriveRecordState(failure("quad9", "A", "TIMEOUT"))).toBe("INDETERMINATE");
    expect(deriveRecordState(failure("quad9", "A", "NETWORK_ERROR"))).toBe("INDETERMINATE");
  });

  it("treats a server-side rcode as undetermined", () => {
    const servfail = {
      ...answer("yandex", "A", "ANSWER", ["1.2.3.4"]),
      rcode: "SERVFAIL",
    } as const;
    expect(deriveRecordState(servfail)).toBe("INDETERMINATE");
  });
});

describe("AC-8.3 and AC-8.4 — quorum", () => {
  it("requires two determined states by default", () => {
    expect(aggregateRecordState(["PRESENT", "INDETERMINATE", "INDETERMINATE"]).state).toBe(
      "INDETERMINATE",
    );
    expect(aggregateRecordState(["PRESENT", "PRESENT"]).state).toBe("PRESENT");
  });

  it("is INDETERMINATE on a tie", () => {
    const outcome = aggregateRecordState(["PRESENT", "ABSENT"]);
    expect(outcome.state).toBe("INDETERMINATE");
    expect(outcome.determinedCount).toBe(2);
  });

  it("needs a strict majority, not a plurality", () => {
    expect(aggregateRecordState(["PRESENT", "PRESENT", "ABSENT", "NAME_NOT_FOUND"]).state).toBe(
      "INDETERMINATE",
    );
    expect(aggregateRecordState(["PRESENT", "PRESENT", "PRESENT", "ABSENT"]).state).toBe("PRESENT");
  });

  it("ignores undetermined states when counting the majority", () => {
    expect(
      aggregateRecordState(["PRESENT", "PRESENT", "INDETERMINATE", "INDETERMINATE"]).state,
    ).toBe("PRESENT");
  });
});

describe("AC-8.5 and PRD 8.5 — resolve checks determine state, not obligation", () => {
  it("passes when every resolver agrees the record is absent", () => {
    const check = evaluateResolveCheck(
      "AAAA",
      [answer("google", "AAAA", "NODATA"), answer("cloudflare", "AAAA", "NODATA")],
      OPTIONS,
    );
    expect(check.status).toBe("PASS");
    expect(check.severity).toBe("none");
    expect(check.details?.state).toBe("ABSENT");
  });

  it("is UNKNOWN with a reason code when the quorum is not reached", () => {
    const check = evaluateResolveCheck(
      "A",
      [answer("google", "A", "ANSWER", ["1.2.3.4"]), failure("quad9", "A", "TIMEOUT")],
      OPTIONS,
    );
    expect(check.status).toBe("UNKNOWN");
    expect(check.reasonCode).toBe("dns_quorum_not_reached");
  });

  it("never carries a reason code on PASS", () => {
    const check = evaluateResolveCheck(
      "A",
      [
        answer("google", "A", "ANSWER", ["1.2.3.4"]),
        answer("cloudflare", "A", "ANSWER", ["1.2.3.4"]),
      ],
      OPTIONS,
    );
    expect(check.reasonCode).toBeUndefined();
  });
});

describe("AC-8.9 — a missing name is judged once", () => {
  const missing = (["A", "AAAA", "MX"] as const).flatMap((qtype) => [
    answer("google", qtype, "NXDOMAIN"),
    answer("cloudflare", qtype, "NXDOMAIN"),
  ]);

  it("fails name existence once, with critical severity", () => {
    const check = evaluateNameExistence(missing, OPTIONS);
    expect(check.status).toBe("FAIL");
    expect(check.severity).toBe("critical");
    expect(check.target.qtype).toBeUndefined();
  });

  it("does not turn the missing name into a failure of each record type", () => {
    for (const qtype of ["A", "AAAA", "MX"] as const) {
      const check = evaluateResolveCheck(
        qtype,
        missing.filter((result) => result.qtype === qtype),
        OPTIONS,
      );
      expect(check.status).toBe("PASS");
      expect(check.severity).toBe("none");
    }
  });

  it("counts NODATA as proof that the name exists", () => {
    const check = evaluateNameExistence(
      [answer("google", "AAAA", "NODATA"), answer("cloudflare", "AAAA", "NODATA")],
      OPTIONS,
    );
    expect(check.status).toBe("PASS");
  });
});

describe("AC-8.6 and PRD 8.7 — resolver consistency", () => {
  it("fails with a warning when one resolver sees the record and another does not", () => {
    const check = evaluateResolverConsistency(
      "A",
      [answer("google", "A", "ANSWER", ["1.2.3.4"]), answer("cloudflare", "A", "NODATA")],
      OPTIONS,
    );
    expect(check.status).toBe("FAIL");
    expect(check.severity).toBe("warning");
  });

  it("marks differing addresses without failing", () => {
    const check = evaluateResolverConsistency(
      "A",
      [
        answer("google", "A", "ANSWER", ["1.2.3.4"]),
        answer("cloudflare", "A", "ANSWER", ["5.6.7.8"]),
      ],
      OPTIONS,
    );
    expect(check.status).toBe("PASS");
    expect(check.severity).toBe("none");
    expect(check.details?.valueVariation).toBe(true);
  });

  it("does not mark variation when every resolver returns the same set in any order", () => {
    const check = evaluateResolverConsistency(
      "A",
      [
        answer("google", "A", "ANSWER", ["1.2.3.4", "5.6.7.8"]),
        answer("cloudflare", "A", "ANSWER", ["5.6.7.8", "1.2.3.4"]),
      ],
      OPTIONS,
    );
    expect(check.details?.valueVariation).toBe(false);
  });
});

describe("AC-8.7 — candidate addresses for security validation", () => {
  it("unions every observed address, including one only a minority saw", () => {
    const candidates = collectAddressCandidates([
      answer("google", "A", "ANSWER", ["1.2.3.4"]),
      answer("cloudflare", "A", "ANSWER", ["1.2.3.4", "5.6.7.8"]),
      answer("quad9", "AAAA", "ANSWER", ["2001:db8::1"]),
      answer("yandex", "MX", "ANSWER", ["mail.example.uz"]),
    ]);
    expect(candidates).toEqual(["1.2.3.4", "5.6.7.8", "2001:db8::1"]);
  });

  it("ignores record types that are not addresses", () => {
    expect(collectAddressCandidates([answer("google", "TXT", "ANSWER", ["v=spf1 -all"])])).toEqual(
      [],
    );
  });
});

describe("AC-8.10 — the DNS target and source contract", () => {
  const check = evaluateResolveCheck(
    "MX",
    [
      answer("google", "MX", "ANSWER", ["mail.example.uz"]),
      answer("cloudflare", "MX", "ANSWER", ["mail.example.uz"]),
    ],
    OPTIONS,
  );

  it("names the target as a DNS name with its query type", () => {
    expect(check.target).toEqual({ kind: "DNS_NAME", qname: "example.uz", qtype: "MX" });
  });

  it("names the source as the resolver set that produced it", () => {
    expect(check.source).toEqual({
      kind: "DNS_RESOLVER_SET",
      resolverSetVersion: "test-1",
      providers: ["google", "cloudflare"],
    });
  });

  it("records the observation time rather than a cache read", () => {
    expect(check.freshness).toEqual({
      checkedAt: "2026-09-15T00:00:00.000Z",
      cached: false,
      cacheAge: 0,
    });
  });
});

/**
 * PRD 13.5 — the wording stays about the records. An MX record says where mail is delivered;
 * it does not say what an organisation has bought, and the message must not either.
 */
describe("PRD 8.3 — the MX check says where the mail goes", () => {
  it("names the mail service in the message and in the details", () => {
    const mx = ["10 aspmx.l.google.com", "20 alt1.aspmx.l.google.com"];
    const check = evaluateResolveCheck(
      "MX",
      [answer("google", "MX", "ANSWER", mx), answer("cloudflare", "MX", "ANSWER", mx)],
      OPTIONS,
    );
    expect(check.status).toBe("PASS");
    expect(check.message.titleCode).toBe("dns.record.resolve.present.mail");
    expect(check.message.params?.service).toBe("Google Workspace");
    expect(check.details?.recognisedServices).toEqual([{ name: "Google Workspace", kind: "mail" }]);
  });

  it("falls back to the plain wording when the exchanger is not one it knows", () => {
    const mx = ["10 mail.example.uz"];
    const check = evaluateResolveCheck(
      "MX",
      [answer("google", "MX", "ANSWER", mx), answer("cloudflare", "MX", "ANSWER", mx)],
      OPTIONS,
    );
    expect(check.message.titleCode).toBe("dns.record.resolve.present");
    expect(check.details?.recognisedServices).toBeUndefined();
  });

  it("does not claim a mail service from a record type that says nothing about mail", () => {
    const check = evaluateResolveCheck(
      "A",
      [
        answer("google", "A", "ANSWER", ["93.184.216.34"]),
        answer("cloudflare", "A", "ANSWER", ["93.184.216.34"]),
      ],
      OPTIONS,
    );
    expect(check.message.titleCode).toBe("dns.record.resolve.present");
  });

  it("keeps the plain wording when MX resolves to nothing", () => {
    const check = evaluateResolveCheck(
      "MX",
      [answer("google", "MX", "NODATA"), answer("cloudflare", "MX", "NODATA")],
      OPTIONS,
    );
    expect(check.message.titleCode).toBe("dns.record.resolve.absent");
  });

  it("collects the services named in TXT", () => {
    const txt = ["v=spf1 include:_spf.google.com -all", "google-site-verification=abc"];
    const check = evaluateResolveCheck(
      "TXT",
      [answer("google", "TXT", "ANSWER", txt), answer("cloudflare", "TXT", "ANSWER", txt)],
      OPTIONS,
    );
    // A token is not a verdict, so it stays in the detail rather than in the title.
    expect(check.message.titleCode).toBe("dns.record.resolve.present");
    expect(check.details?.recognisedServices?.map((service) => service.name)).toEqual([
      "Google Workspace",
      "Google Search Console",
    ]);
  });
});

/**
 * PRD 8.7 — "the resolvers disagree" leaves a reader to open the technical panel and work out
 * which resolver is which. Both sides are named instead.
 */
describe("a split between resolvers says which side each one is on", () => {
  const seen = ["91.216.37.41"];

  function split(qtype: "A") {
    return [
      answer("google", qtype, "NXDOMAIN"),
      answer("cloudflare", qtype, "NXDOMAIN"),
      answer("yandex-basic", qtype, "ANSWER", seen),
      answer("quad9-unfiltered", qtype, "ANSWER", seen),
    ];
  }

  it("names who sees the record and who does not, with the resolver profile intact", () => {
    const check = evaluateResolverConsistency("A", split("A"), OPTIONS);
    expect(check.status).toBe("FAIL");
    expect(check.message.params?.seeing).toBe("Yandex Basic, Quad9 Unfiltered");
    expect(check.message.params?.missing).toBe("Google, Cloudflare");
  });

  it("carries the same two lists on the resolve check that could not conclude", () => {
    const check = evaluateResolveCheck("A", split("A"), OPTIONS);
    expect(check.status).toBe("UNKNOWN");
    expect(check.message.titleCode).toBe("dns.record.resolve.unknown.split");
    expect(check.message.params?.missing).toBe("Google, Cloudflare");
  });

  it("keeps the plain wording when there are no two sides to name", () => {
    // Everybody timed out: nothing was seen and nothing was denied.
    const check = evaluateResolveCheck(
      "A",
      [failure("google", "A", "TIMEOUT"), failure("cloudflare", "A", "TIMEOUT")],
      OPTIONS,
    );
    expect(check.message.titleCode).toBe("dns.record.resolve.unknown");
    expect(check.message.params?.seeing).toBeUndefined();
  });

  it("says nothing of the kind when the resolvers agree", () => {
    const agreed = ["google", "cloudflare"].map((name) => answer(name, "A", "ANSWER", seen));
    const check = evaluateResolverConsistency("A", agreed, OPTIONS);
    expect(check.status).toBe("PASS");
    expect(check.message.params?.seeing).toBeUndefined();
  });
});
