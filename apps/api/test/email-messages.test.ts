import { analyseSpf, evaluateSpfChecks, SPF_CHECK_IDS, type SpfLookupAnswer } from "@2check/domain";
import { LANGUAGES, resolveMessage } from "@2check/messages";
import { describe, expect, it } from "vitest";

/**
 * 1.1 §11 — every outcome the SPF module can produce has to be sayable in all three languages.
 * The domain module and the catalogue live in different packages and are tested separately, so
 * this is the only place a code that nobody wrote a message for would be caught.
 */
const FRESHNESS = { checkedAt: "2026-10-02T00:00:00.000Z", cached: false, cacheAge: 0 } as const;

async function outcome(
  answer: SpfLookupAnswer,
  zone: Readonly<Record<string, SpfLookupAnswer>> = {},
) {
  const analysis = await analyseSpf({
    domain: "example.uz",
    answer,
    lookup: async (name) => zone[name] ?? { outcome: "NAME_NOT_FOUND" },
  });
  return evaluateSpfChecks(analysis, { domain: "example.uz", freshness: FRESHNESS });
}

function answer(...records: string[]): SpfLookupAnswer {
  return { outcome: "ANSWER", records };
}

/** One of every branch the module can take. */
async function everyOutcome() {
  const loop = {
    "loop.uz": answer("v=spf1 include:example.uz -all"),
    "example.uz": answer("v=spf1 include:loop.uz -all"),
  };
  const results = await Promise.all([
    outcome(answer("v=spf1 -all")),
    outcome(answer("v=spf1 ~all")),
    outcome(answer("v=spf1 ?all")),
    outcome(answer("v=spf1 +all")),
    outcome(answer("v=spf1 ip4:203.0.113.1")),
    outcome(answer("v=spf1 ptr -all")),
    outcome(answer("v=spf1 a a a a a a a a a a a -all")),
    outcome(answer("v=spf1 include:a.uz include:b.uz include:c.uz -all")),
    outcome(answer("v=spf1 include:loop.uz -all"), loop),
    outcome(answer("v=spf1 include:%{i}.block.uz -all")),
    outcome(answer("v=spf1 redirect=gone.uz")),
    outcome(answer("v=spf1 -all", "v=spf1 ip4:203.0.113.0/24 -all")),
    outcome(answer("v=spf1 frobnicate -all")),
    outcome({ outcome: "EMPTY" }),
    outcome({ outcome: "INDETERMINATE" }),
  ]);
  return results.flat();
}

describe("the SPF messages", () => {
  it("covers every outcome the module produces, in every mandatory language", async () => {
    const codes = new Set((await everyOutcome()).map((check) => check.message.titleCode));
    expect(codes.size).toBeGreaterThan(10);
    for (const language of LANGUAGES) {
      for (const code of codes) {
        const resolved = resolveMessage({ titleCode: code }, language);
        expect(resolved.title, `${code} in ${language}`).not.toBe("");
      }
    }
  });

  it("leaves no placeholder unfilled in a rendered title or fact", async () => {
    for (const check of await everyOutcome()) {
      for (const language of LANGUAGES) {
        const resolved = resolveMessage(check.message, language);
        expect(`${resolved.title} ${resolved.fact ?? ""}`, check.message.titleCode).not.toMatch(
          /\{[a-zA-Z]+\}/,
        );
      }
    }
  });

  it("gives an impact and a recommendation only where a failure was confirmed", async () => {
    for (const check of await everyOutcome()) {
      const resolved = resolveMessage(check.message, "ru");
      if (resolved.impact !== undefined || resolved.recommendation !== undefined) {
        expect(check.status, check.message.titleCode).toBe("FAIL");
      }
    }
  });

  it("says nothing about the fate of a message", async () => {
    // 1.1 §11.2 — the forbidden claims all share one shape, and spam is where it shows up.
    const forbidden = /спам|spam|не дойд|не доставл|not be delivered|will land/i;
    for (const check of await everyOutcome()) {
      for (const language of LANGUAGES) {
        const resolved = resolveMessage(check.message, language);
        const text = [
          resolved.title,
          resolved.fact,
          resolved.explanation,
          resolved.impact,
          resolved.recommendation,
        ]
          .filter((part): part is string => part !== undefined)
          .join(" ");
        expect(text, check.message.titleCode).not.toMatch(forbidden);
      }
    }
  });

  it("blocks the dependent checks on the record check rather than on a reason of their own", async () => {
    const checks = await outcome({ outcome: "EMPTY" });
    const blocked = checks.filter((check) => check.status === "NOT_APPLICABLE");
    expect(blocked).toHaveLength(3);
    for (const check of blocked) {
      expect(check.blockedBy).toBe(SPF_CHECK_IDS.record);
    }
  });
});
