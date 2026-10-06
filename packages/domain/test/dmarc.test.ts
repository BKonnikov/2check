import { describe, expect, it } from "vitest";
import {
  analyseDmarc,
  DMARC_CHECK_IDS,
  DMARC_QUERY_LIMIT,
  type DmarcAnalysisInput,
  type DmarcLookupAnswer,
  dmarcWalkTargets,
  evaluateDmarcChecks,
  parseDmarcRecord,
} from "../src/index.js";

const FRESHNESS = { checkedAt: "2026-10-05T00:00:00.000Z", cached: false, cacheAge: 0 } as const;

function answer(...records: string[]): DmarcLookupAnswer {
  return { outcome: "ANSWER", records };
}

/** A zone keyed by policy name, so a test writes only the names it cares about. */
function zone(entries: Readonly<Record<string, DmarcLookupAnswer>>) {
  const asked: string[] = [];
  const lookup = async (name: string): Promise<DmarcLookupAnswer> => {
    asked.push(name);
    return entries[name] ?? { outcome: "NAME_NOT_FOUND" };
  };
  return { lookup, asked };
}

async function analyse(
  domain: string,
  own: DmarcLookupAnswer,
  entries: Readonly<Record<string, DmarcLookupAnswer>> = {},
  extra: Partial<DmarcAnalysisInput> = {},
) {
  const { lookup, asked } = zone(entries);
  const analysis = await analyseDmarc({ domain, answer: own, lookup, ...extra });
  return { analysis, asked };
}

async function checks(
  domain: string,
  own: DmarcLookupAnswer,
  entries: Readonly<Record<string, DmarcLookupAnswer>> = {},
  extra: Partial<DmarcAnalysisInput> = {},
) {
  const { analysis } = await analyse(domain, own, entries, extra);
  const results = evaluateDmarcChecks(analysis, { domain, freshness: FRESHNESS });
  return {
    analysis,
    results,
    by: (checkId: string) => results.find((result) => result.checkId === checkId),
  };
}

describe("AC-4.4 — the record is recognised by its version tag", () => {
  it("accepts a record whose v tag comes first with the exact value", () => {
    const record = parseDmarcRecord("v=DMARC1; p=reject; rua=mailto:d@example.uz");
    expect(record?.tags.get("p")).toBe("reject");
    expect(record?.tags.get("rua")).toBe("mailto:d@example.uz");
  });

  it("rejects a record whose version is written in another case", () => {
    expect(parseDmarcRecord("v=dmarc1; p=reject")).toBeUndefined();
  });

  it("rejects a record whose version does not come first", () => {
    expect(parseDmarcRecord("p=reject; v=DMARC1")).toBeUndefined();
  });

  it("ignores a tag it cannot read rather than discarding the record", () => {
    // RFC 9989 §4.7 — an unknown tag is ignored, and a malformed one is no worse.
    const record = parseDmarcRecord("v=DMARC1; p=reject; nonsense; adkim=s");
    expect(record?.tags.get("p")).toBe("reject");
    expect(record?.tags.get("adkim")).toBe("s");
  });

  it("keeps the first occurrence of a repeated tag", () => {
    expect(parseDmarcRecord("v=DMARC1; p=reject; p=none")?.tags.get("p")).toBe("reject");
  });
});

describe("AC-4.2 — where the record is read from", () => {
  it("queries the domain's own policy name and walks no further once it answers", async () => {
    const { analysis, asked } = await analyse("example.uz", answer("v=DMARC1; p=reject"));
    expect(analysis.recordState).toBe("OWN");
    expect(asked).toEqual([]);
    expect(analysis.queries).toBe(1);
  });

  it("walks up one label at a time when the domain has no record", async () => {
    const { asked } = await analyse("a.b.example.uz", { outcome: "EMPTY" });
    expect(asked).toEqual(["_dmarc.b.example.uz", "_dmarc.example.uz", "_dmarc.uz"]);
  });

  it("shortens a name of more than seven labels before walking", () => {
    const targets = dmarcWalkTargets("a.b.c.d.e.f.g.h.i.uz");
    expect(targets[0]?.split(".")).toHaveLength(7);
    expect(targets).toHaveLength(7);
  });

  it("never spends more than eight queries, however deep the name", async () => {
    const { analysis, asked } = await analyse("a.b.c.d.e.f.g.h.i.j.uz", { outcome: "EMPTY" });
    expect(asked).toHaveLength(DMARC_QUERY_LIMIT - 1);
    expect(analysis.queries).toBe(DMARC_QUERY_LIMIT);
  });
});

describe("AC-4.3 — the source of the applied policy is reported", () => {
  it("names the higher domain an inherited policy came from", async () => {
    const { analysis, by } = await checks(
      "mail.example.uz",
      { outcome: "EMPTY" },
      {
        "_dmarc.example.uz": answer("v=DMARC1; p=reject; sp=quarantine"),
      },
    );
    expect(analysis.recordState).toBe("INHERITED");
    expect(analysis.policyDomain).toBe("example.uz");
    const record = by(DMARC_CHECK_IDS.record);
    expect(record?.status).toBe("PASS");
    expect(record?.message.titleCode).toBe("email.dmarc.record.present.inherited");
    expect(record?.message.params?.source).toBe("example.uz");
  });

  it("marks a policy that came from a public suffix as such", async () => {
    const { analysis, by } = await checks(
      "example.bank",
      { outcome: "EMPTY" },
      {
        "_dmarc.bank": answer("v=DMARC1; p=reject; sp=reject; psd=y"),
      },
    );
    expect(analysis.fromPublicSuffix).toBe(true);
    expect(analysis.organisationalDomain).toBe("example.bank");
    expect(by(DMARC_CHECK_IDS.record)?.message.titleCode).toBe("email.dmarc.record.present.suffix");
  });

  it("stops at a record that declares itself the organisational domain", async () => {
    const { analysis, asked } = await analyse(
      "mail.example.uz",
      { outcome: "EMPTY" },
      {
        "_dmarc.example.uz": answer("v=DMARC1; p=reject; psd=n"),
        "_dmarc.uz": answer("v=DMARC1; p=none"),
      },
    );
    expect(analysis.organisationalDomain).toBe("example.uz");
    expect(analysis.policyDomain).toBe("example.uz");
    expect(asked).not.toContain("_dmarc.uz");
  });

  it("takes the record highest up the tree when no record declares a boundary", async () => {
    // RFC 9989 §4.10.2 — with no psd tag anywhere, the record with the fewest labels marks the
    // organisational domain, which is why a public suffix is meant to publish psd=y.
    const { analysis } = await analyse(
      "mail.example.uz",
      { outcome: "EMPTY" },
      {
        "_dmarc.example.uz": answer("v=DMARC1; p=none"),
        "_dmarc.uz": answer("v=DMARC1; p=reject; sp=reject"),
      },
    );
    expect(analysis.organisationalDomain).toBe("uz");
    expect(analysis.effectivePolicy).toBe("reject");
  });
});

describe("AC-4.5 and AC-4.6 — presence and recognition", () => {
  it("fails with a warning when no record is found anywhere on the path", async () => {
    const { by, results } = await checks("example.uz", { outcome: "EMPTY" });
    const record = by(DMARC_CHECK_IDS.record);
    expect(record?.status).toBe("FAIL");
    expect(record?.severity).toBe("warning");
    expect(results.filter((result) => result.status === "NOT_APPLICABLE")).toHaveLength(3);
  });

  it("fails critically when the name carries more than one record", async () => {
    const { by } = await checks("example.uz", answer("v=DMARC1; p=reject", "v=DMARC1; p=none"));
    const record = by(DMARC_CHECK_IDS.record);
    expect(record?.status).toBe("FAIL");
    expect(record?.severity).toBe("critical");
    expect(record?.message.params?.count).toBe(2);
  });

  it("fails critically when a record meant to be DMARC is not recognised", async () => {
    const { by } = await checks("example.uz", answer("v=dmarc1; p=reject"));
    const record = by(DMARC_CHECK_IDS.record);
    expect(record?.status).toBe("FAIL");
    expect(record?.severity).toBe("critical");
    expect(record?.message.titleCode).toBe("email.dmarc.record.fail.unrecognised");
  });

  it("treats an unrelated record at the policy name as no policy at all", async () => {
    const { analysis } = await analyse("example.uz", answer("some-verification=abc"));
    expect(analysis.recordState).toBe("ABSENT");
  });

  it("blocks the dependent checks on the record check rather than on a reason of their own", async () => {
    const { results } = await checks("example.uz", { outcome: "EMPTY" });
    for (const result of results.filter((entry) => entry.status === "NOT_APPLICABLE")) {
      expect(result.blockedBy).toBe(DMARC_CHECK_IDS.record);
      expect(result.reasonCode).toBeUndefined();
    }
  });
});

describe("AC-4.7 and AC-4.8 — the effective policy", () => {
  it.each([
    ["reject", "PASS", "email.dmarc.policy.pass.reject"],
    ["quarantine", "PASS", "email.dmarc.policy.pass.quarantine"],
  ])("reads p=%s as %s", async (policy, status, code) => {
    const { by } = await checks("example.uz", answer(`v=DMARC1; p=${policy}`));
    expect(by(DMARC_CHECK_IDS.policy)?.status).toBe(status);
    expect(by(DMARC_CHECK_IDS.policy)?.message.titleCode).toBe(code);
  });

  it("reads p=none as a warning rather than as an error", async () => {
    const { by } = await checks("example.uz", answer("v=DMARC1; p=none"));
    const policy = by(DMARC_CHECK_IDS.policy);
    expect(policy?.status).toBe("FAIL");
    expect(policy?.severity).toBe("warning");
    expect(policy?.message.titleCode).toBe("email.dmarc.policy.fail.none");
  });

  it.each(["v=DMARC1; rua=mailto:d@example.uz", "v=DMARC1; p=bogus"])(
    "reads a missing or unusable policy tag as none: %s",
    async (text) => {
      const { by } = await checks("example.uz", answer(text));
      const policy = by(DMARC_CHECK_IDS.policy);
      expect(policy?.status).toBe("FAIL");
      expect(policy?.severity).toBe("warning");
      expect(policy?.message.titleCode).toBe("email.dmarc.policy.fail.absent");
    },
  );

  it("takes sp for a subdomain that exists", async () => {
    const { analysis } = await analyse(
      "mail.example.uz",
      { outcome: "EMPTY" },
      { "_dmarc.example.uz": answer("v=DMARC1; p=reject; sp=quarantine; np=none") },
      { domainExists: true },
    );
    expect(analysis.policyTag).toBe("sp");
    expect(analysis.effectivePolicy).toBe("quarantine");
  });

  it("takes np for a subdomain that does not exist", async () => {
    const { analysis } = await analyse(
      "mail.example.uz",
      { outcome: "EMPTY" },
      { "_dmarc.example.uz": answer("v=DMARC1; p=reject; sp=quarantine; np=none") },
      { domainExists: false },
    );
    expect(analysis.policyTag).toBe("np");
    expect(analysis.effectivePolicy).toBe("none");
  });

  it("falls back to p when the inherited record states no subdomain policy", async () => {
    const { analysis } = await analyse(
      "mail.example.uz",
      { outcome: "EMPTY" },
      {
        "_dmarc.example.uz": answer("v=DMARC1; p=reject"),
      },
    );
    expect(analysis.policyTag).toBe("p");
    expect(analysis.effectivePolicy).toBe("reject");
  });

  it("does not reach for np when existence was not established", async () => {
    const { analysis } = await analyse(
      "mail.example.uz",
      { outcome: "EMPTY" },
      {
        "_dmarc.example.uz": answer("v=DMARC1; p=reject; sp=quarantine; np=none"),
      },
    );
    expect(analysis.policyTag).toBe("sp");
  });

  it("names the tag and the domain the policy came from", async () => {
    const { by } = await checks(
      "mail.example.uz",
      { outcome: "EMPTY" },
      {
        "_dmarc.example.uz": answer("v=DMARC1; p=none; sp=reject"),
      },
    );
    const policy = by(DMARC_CHECK_IDS.policy);
    expect(policy?.message.params).toMatchObject({ source: "example.uz", tag: "sp" });
  });
});

describe("AC-4.9 — aggregate reports", () => {
  it("passes when the record names an address for them", async () => {
    const { by } = await checks(
      "example.uz",
      answer("v=DMARC1; p=reject; rua=mailto:dmarc@example.uz"),
    );
    expect(by(DMARC_CHECK_IDS.reports)?.status).toBe("PASS");
  });

  it("reports their absence as informational", async () => {
    const { by } = await checks("example.uz", answer("v=DMARC1; p=reject"));
    const reports = by(DMARC_CHECK_IDS.reports);
    expect(reports?.status).toBe("FAIL");
    expect(reports?.severity).toBe("informational");
  });

  it("does not count an rua tag that names no address", async () => {
    const { by } = await checks("example.uz", answer("v=DMARC1; p=reject; rua="));
    expect(by(DMARC_CHECK_IDS.reports)?.status).toBe("FAIL");
  });

  it("names the domains the reports are addressed to", async () => {
    // 1.1 §9.4 — the recipient domain is public, because it says whether the reports leave.
    const { analysis, by } = await checks(
      "example.uz",
      answer("v=DMARC1; p=reject; rua=mailto:dmarc@example.uz!10m,mailto:agg@reports.example.net"),
    );
    expect(analysis.reportDomains).toEqual(["example.uz", "reports.example.net"]);
    expect(by(DMARC_CHECK_IDS.reports)?.message.params?.domains).toBe(
      "example.uz, reports.example.net",
    );
  });

  it("keeps the addresses out of every message, and only in the technical detail", async () => {
    /**
     * 1.1 §9.4 — the domain a report goes to answers the question a reader has, so it is Public;
     * the address itself is available on an explicit request and never in a message, which is
     * what the public projection serves.
     */
    const { results, by } = await checks(
      "example.uz",
      answer("v=DMARC1; p=reject; rua=mailto:dmarc@example.uz; ruf=mailto:f@example.uz"),
    );
    for (const result of results) {
      expect(JSON.stringify(result.message)).not.toContain("dmarc@example.uz");
    }
    expect(by(DMARC_CHECK_IDS.reports)?.details).toEqual({
      reportAddresses: ["mailto:dmarc@example.uz"],
    });
  });
});

describe("AC-4.10 — the superseded pct tag", () => {
  it("reports it with a warning", async () => {
    const { by } = await checks("example.uz", answer("v=DMARC1; p=reject; pct=20"));
    const deprecated = by(DMARC_CHECK_IDS.deprecated);
    expect(deprecated?.status).toBe("FAIL");
    expect(deprecated?.severity).toBe("warning");
  });

  it("passes a record written without it", async () => {
    const { by } = await checks("example.uz", answer("v=DMARC1; p=reject"));
    expect(by(DMARC_CHECK_IDS.deprecated)?.status).toBe("PASS");
  });
});

describe("AC-4.11 — a technical failure concludes nothing", () => {
  it("returns UNKNOWN when the domain's own query did not complete", async () => {
    const { by } = await checks("example.uz", { outcome: "INDETERMINATE" });
    const record = by(DMARC_CHECK_IDS.record);
    expect(record?.status).toBe("UNKNOWN");
    expect(record?.reasonCode).toBe("dmarc_lookup_failed");
  });

  it("returns UNKNOWN when the walk could not be finished", async () => {
    const { analysis, by } = await checks(
      "mail.example.uz",
      { outcome: "EMPTY" },
      {
        "_dmarc.example.uz": { outcome: "INDETERMINATE" },
      },
    );
    expect(analysis.recordState).toBe("WALK_INCOMPLETE");
    const record = by(DMARC_CHECK_IDS.record);
    expect(record?.status).toBe("UNKNOWN");
    expect(record?.reasonCode).toBe("dmarc_tree_walk_incomplete");
  });

  it("carries no severity and no impact on an unfinished walk", async () => {
    const { by } = await checks(
      "mail.example.uz",
      { outcome: "EMPTY" },
      {
        "_dmarc.example.uz": { outcome: "INDETERMINATE" },
      },
    );
    expect(by(DMARC_CHECK_IDS.record)?.severity).toBe("none");
  });
});

describe("1.1 §9 — the shape of the results", () => {
  it("names the policy name it queried as the target", async () => {
    const { results } = await checks("example.uz", answer("v=DMARC1; p=reject"));
    for (const result of results) {
      expect(result.target).toEqual({
        kind: "EMAIL_POLICY",
        policy: "DMARC",
        queriedName: "_dmarc.example.uz",
      });
      expect(result.category).toBe("email");
    }
  });

  it("produces each of the section's four checks exactly once", async () => {
    const { results } = await checks("example.uz", answer("v=DMARC1; p=reject"));
    expect(results.map((result) => result.checkId).sort()).toEqual(
      Object.values(DMARC_CHECK_IDS).slice().sort(),
    );
  });
});
