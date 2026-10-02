import { describe, expect, it } from "vitest";
import {
  analyseSpf,
  evaluateSpfChecks,
  isSpfRecord,
  parseSpfRecord,
  SPF_CHECK_IDS,
  type SpfLookupAnswer,
} from "../src/spf.js";

const FRESHNESS = { checkedAt: "2026-10-02T00:00:00.000Z", cached: false, cacheAge: 0 } as const;

/** A zone recorded in advance; 1.1 §17.1 — this analysis is tested without a network. */
function zone(
  records: Readonly<Record<string, readonly string[] | "empty" | "nxdomain" | "fail">>,
) {
  return async (name: string): Promise<SpfLookupAnswer> => {
    const entry = records[name];
    if (entry === undefined || entry === "nxdomain") {
      return { outcome: "NAME_NOT_FOUND" };
    }
    if (entry === "empty") {
      return { outcome: "EMPTY" };
    }
    if (entry === "fail") {
      return { outcome: "INDETERMINATE" };
    }
    return { outcome: "ANSWER", records: entry };
  };
}

async function analyse(
  text: readonly string[] | "empty" | "fail",
  records: Parameters<typeof zone>[0] = {},
) {
  const answer: SpfLookupAnswer =
    text === "fail"
      ? { outcome: "INDETERMINATE" }
      : text === "empty"
        ? { outcome: "EMPTY" }
        : { outcome: "ANSWER", records: text };
  return await analyseSpf({ domain: "example.uz", answer, lookup: zone(records) });
}

function statuses(checks: readonly { checkId: string; status: string; severity: string }[]) {
  return Object.fromEntries(checks.map((c) => [c.checkId, `${c.status}/${c.severity}`]));
}

async function checks(
  text: readonly string[] | "empty" | "fail",
  records: Parameters<typeof zone>[0] = {},
) {
  const analysis = await analyse(text, records);
  return evaluateSpfChecks(analysis, { domain: "example.uz", freshness: FRESHNESS });
}

describe("AC-3.1, AC-3.2 — recognising the record", () => {
  it("accepts the version term in any case, followed by a space or the end", () => {
    expect(isSpfRecord("v=spf1 -all")).toBe(true);
    expect(isSpfRecord("V=SPF1")).toBe(true);
    expect(isSpfRecord(" v=spf1 ")).toBe(true);
  });

  it("does not mistake another TXT value for a policy", () => {
    expect(isSpfRecord("v=spf10 -all")).toBe(false);
    expect(isSpfRecord("google-site-verification=abc")).toBe(false);
    expect(isSpfRecord("v=DMARC1; p=reject")).toBe(false);
  });

  it("reads only the TXT answer it was handed, and asks for no other type", async () => {
    // The analysis takes one answer and a lookup for names it finds; there is no second qtype.
    const analysis = await analyse(["v=spf1 -all"]);
    expect(analysis.recordState).toBe("SINGLE");
    expect(analysis.traversedNames).toEqual(["example.uz"]);
  });
});

describe("AC-3.3, AC-3.4 — how many records", () => {
  it("treats an absent record as a confirmed fact, not an unknown one", async () => {
    expect(statuses(await checks("empty"))[SPF_CHECK_IDS.record]).toBe("FAIL/warning");
  });

  it("treats a failed lookup as unknown rather than absent", async () => {
    const result = (await checks("fail")).find((c) => c.checkId === SPF_CHECK_IDS.record);
    expect(result?.status).toBe("UNKNOWN");
    expect(result?.reasonCode).toBe("spf_lookup_failed");
  });

  it("rejects more than one record outright", async () => {
    const got = await checks(["v=spf1 -all", "v=spf1 ip4:203.0.113.0/24 -all"]);
    expect(statuses(got)[SPF_CHECK_IDS.record]).toBe("FAIL/critical");
  });

  it("blocks the other conditions on the record rather than inventing failures for them", async () => {
    const got = await checks("empty");
    for (const id of [SPF_CHECK_IDS.limits, SPF_CHECK_IDS.policy, SPF_CHECK_IDS.deprecated]) {
      const one = got.find((c) => c.checkId === id);
      expect(one?.status).toBe("NOT_APPLICABLE");
      expect(one?.blockedBy).toBe(SPF_CHECK_IDS.record);
      expect(one?.reasonCode).toBeUndefined();
    }
  });

  it("rejects a record the grammar does not admit", async () => {
    expect(
      statuses(await checks(["v=spf1 include:a.uz frobnicate -all"]))[SPF_CHECK_IDS.record],
    ).toBe("FAIL/critical");
  });
});

describe("AC-3.5, AC-3.6 — counting the terms a receiver evaluates", () => {
  it("counts nested includes along the path", async () => {
    const analysis = await analyse(["v=spf1 include:one.uz include:two.uz -all"], {
      "one.uz": ["v=spf1 a mx -all"],
      "two.uz": ["v=spf1 include:three.uz -all"],
      "three.uz": ["v=spf1 a -all"],
    });
    // include:one(1) + a(1) + mx(1) + include:two(1) + include:three(1) + a(1)
    expect(analysis.lookupCount).toBe(6);
    expect(analysis.traversalIncomplete).toBe(false);
  });

  it("does not count terms after all, which are never evaluated", async () => {
    const analysis = await analyse(["v=spf1 a -all include:unused.uz mx"], {
      "unused.uz": ["v=spf1 a a a a a a a a a a a a -all"],
    });
    expect(analysis.lookupCount).toBe(1);
  });

  it("ignores redirect when an all is present, as RFC 7208 requires", async () => {
    const analysis = await analyse(["v=spf1 a redirect=other.uz -all"], {
      "other.uz": ["v=spf1 a a a a a a a a a a a a -all"],
    });
    expect(analysis.lookupCount).toBe(1);
  });

  it("does not count all, ip4 and ip6", async () => {
    const analysis = await analyse(["v=spf1 ip4:203.0.113.0/24 ip6:2001:db8::/32 -all"]);
    expect(analysis.lookupCount).toBe(0);
  });

  it("reports an established excess as a confirmed failure", async () => {
    const analysis = await analyse(["v=spf1 a a a a a a a a a a a -all"]);
    expect(analysis.lookupCount).toBe(11);
    expect(
      statuses(evaluateSpfChecks(analysis, { domain: "example.uz", freshness: FRESHNESS }))[
        SPF_CHECK_IDS.limits
      ],
    ).toBe("FAIL/critical");
  });

  it("will not claim an excess it could not establish", async () => {
    // The included name could not be followed, so the count is a lower bound under the limit.
    const got = await checks(["v=spf1 include:broken.uz a -all"], { "broken.uz": "fail" });
    const limits = got.find((c) => c.checkId === SPF_CHECK_IDS.limits);
    expect(limits?.status).toBe("UNKNOWN");
    expect(limits?.reasonCode).toBe("spf_traversal_incomplete");
  });

  it("will not claim an excess when a name depends on the sender", async () => {
    const analysis = await analyse(["v=spf1 include:%{i}.block.uz -all"]);
    expect(analysis.traversalIncomplete).toBe(true);
  });

  it("still reports an excess already reached before the unfollowable part", async () => {
    const got = await checks(["v=spf1 a a a a a a a a a a a include:broken.uz -all"], {
      "broken.uz": "fail",
    });
    expect(statuses(got)[SPF_CHECK_IDS.limits]).toBe("FAIL/critical");
  });
});

describe("AC-3.7, AC-3.8 — void lookups and loops", () => {
  it("counts answers that hold nothing and names that do not exist", async () => {
    const analysis = await analyse(
      ["v=spf1 include:a.uz include:b.uz include:c.uz include:d.uz -all"],
      { "a.uz": "empty", "b.uz": "nxdomain", "c.uz": "empty", "d.uz": ["v=spf1 -all"] },
    );
    expect(analysis.voidLookups).toBe(3);
  });

  it("treats exceeding the recommended void limit as a warning, not a critical failure", async () => {
    const got = await checks(["v=spf1 include:a.uz include:b.uz include:c.uz -all"], {
      "a.uz": "empty",
      "b.uz": "empty",
      "c.uz": "empty",
    });
    expect(statuses(got)[SPF_CHECK_IDS.limits]).toBe("FAIL/warning");
  });

  it("detects a loop and reports it as a published policy that cannot work", async () => {
    const got = await checks(["v=spf1 include:loop.uz -all"], {
      "loop.uz": ["v=spf1 include:example.uz -all"],
      // The zone has to hold the domain itself: the loop closes by coming back to it.
      "example.uz": ["v=spf1 include:loop.uz -all"],
    });
    expect(statuses(got)[SPF_CHECK_IDS.limits]).toBe("FAIL/critical");
  });
});

describe("AC-3.9 — what the record says about unlisted senders", () => {
  const cases = [
    ["-all", "PASS/none"],
    ["~all", "PASS/none"],
    ["?all", "FAIL/warning"],
    ["+all", "FAIL/critical"],
  ] as const;

  for (const [mechanism, expected] of cases) {
    it(`reads ${mechanism} as ${expected}`, async () => {
      expect(
        statuses(await checks([`v=spf1 ip4:203.0.113.1 ${mechanism}`]))[SPF_CHECK_IDS.policy],
      ).toBe(expected);
    });
  }

  it("treats a record with neither all nor redirect as stating nothing", async () => {
    expect(statuses(await checks(["v=spf1 ip4:203.0.113.1"]))[SPF_CHECK_IDS.policy]).toBe(
      "FAIL/warning",
    );
  });

  it("takes the policy from the redirect target when the record has no all of its own", async () => {
    const analysis = await analyse(["v=spf1 redirect=policy.uz"], {
      "policy.uz": ["v=spf1 ip4:203.0.113.0/24 -all"],
    });
    expect(analysis.allQualifier).toBe("-");
    expect(analysis.allFrom).toBe("policy.uz");
  });

  it("does not take the policy from an include, which ends only its own evaluation", async () => {
    const analysis = await analyse(["v=spf1 include:partner.uz"], {
      "partner.uz": ["v=spf1 ip4:203.0.113.0/24 -all"],
    });
    expect(analysis.allQualifier).toBeUndefined();
  });
});

describe("AC-3.10 — the deprecated mechanism", () => {
  it("warns when ptr is published and leaves the other conditions alone", async () => {
    const got = await checks(["v=spf1 ptr -all"]);
    expect(statuses(got)[SPF_CHECK_IDS.deprecated]).toBe("FAIL/warning");
    expect(statuses(got)[SPF_CHECK_IDS.policy]).toBe("PASS/none");
  });

  it("passes when it is not", async () => {
    expect(statuses(await checks(["v=spf1 -all"]))[SPF_CHECK_IDS.deprecated]).toBe("PASS/none");
  });
});

describe("the parser", () => {
  it("defaults a mechanism with no qualifier to pass", () => {
    const record = parseSpfRecord("v=spf1 a:mail.example.uz -all");
    expect(record?.terms[0]).toEqual({
      kind: "mechanism",
      name: "a",
      qualifier: "+",
      argument: "mail.example.uz",
    });
  });

  it("keeps an unknown modifier rather than rejecting the record", () => {
    // RFC 7208 §6 — unrecognised modifiers are ignored, not errors.
    expect(parseSpfRecord("v=spf1 exp=why.example.uz -all")?.terms).toHaveLength(2);
  });
});
