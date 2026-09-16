import { describe, expect, it } from "vitest";
import { CHROME } from "../app/_components/chrome";
import { buildShareCardModel } from "../app/_components/shareCard";

const UI = CHROME.ru.ui;

function scan(overrides: Record<string, unknown> = {}) {
  return {
    scanId: "3f2a6d1e-0000-4000-8000-1234567890ab",
    mode: "FULL",
    canonicalDomain: { unicodeHostname: "почта.uz", asciiHostname: "xn--80a1acny.uz" },
    completedAt: "2026-09-15T12:30:00.000Z",
    categories: [
      {
        category: "dns",
        status: "FAIL",
        checks: [
          { status: "PASS", freshness: { checkedAt: "2026-09-15T12:29:00.000Z" } },
          { status: "PASS", freshness: { checkedAt: "2026-09-15T12:29:00.000Z" } },
          { status: "FAIL", freshness: { checkedAt: "2026-09-15T12:29:00.000Z" } },
        ],
      },
      { category: "registry", status: "UNKNOWN", checks: [{ status: "UNKNOWN" }] },
      {
        category: "tls",
        status: "PASS",
        checks: [{ status: "PASS" }, { status: "NOT_APPLICABLE" }],
      },
    ],
    summary: {
      state: "FINAL",
      verdictCode: "RECOMMENDATIONS",
      score: 78,
      confidence: { level: "REDUCED" },
      issues: [
        {
          severity: "critical",
          message: { titleCode: "tls.certificate.hostname.fail" },
        },
        {
          severity: "warning",
          message: { titleCode: "dns.record.consistency.fail", params: { recordType: "MX" } },
        },
      ],
    },
    ...overrides,
  } as Parameters<typeof buildShareCardModel>[0];
}

/**
 * PRD 23.9 — the card carries the safe public representation and nothing else. These are the
 * rules that keep it that way, checked on the model rather than on pixels.
 */
describe("AC-23.8 — the share card carries nothing it should not", () => {
  it("names the domain and no identifier, URL or input", () => {
    const model = buildShareCardModel(scan(), "ru", UI);
    const serialised = JSON.stringify(model);
    expect(model.domain).toBe("почта.uz");
    expect(serialised).not.toContain("3f2a6d1e");
    expect(serialised).not.toMatch(/https?:\/\//);
    expect(serialised).not.toContain("scanId");
    // AC-24.7 — the string the reader typed never reaches a representation of the result.
    expect(serialised).not.toContain("originalInput");
  });

  it("carries no technical detail", () => {
    const model = buildShareCardModel(scan(), "ru", UI);
    const serialised = JSON.stringify(model);
    for (const technical of ["93.184", "fingerprint", "TLSv1", "registrar", "nameServers"]) {
      expect(serialised).not.toContain(technical);
    }
  });

  it("says nothing about a partial check when the scan was full", () => {
    expect(buildShareCardModel(scan(), "ru", UI).partialLabel).toBeUndefined();
  });

  it("shows at most two issues, however many there are", () => {
    const many = scan({
      summary: {
        state: "FINAL",
        verdictCode: "PROBLEMS",
        score: 10,
        confidence: { level: "HIGH" },
        issues: Array.from({ length: 7 }, () => ({
          severity: "warning",
          message: { titleCode: "dns.record.consistency.fail", params: { recordType: "MX" } },
        })),
      },
    });
    expect(buildShareCardModel(many, "ru", UI).issues).toHaveLength(2);
  });
});

describe("AC-23.3 — a PARTIAL card states nothing about the whole domain", () => {
  it("has no verdict and no score", () => {
    const partial = scan({
      mode: "PARTIAL",
      categories: [{ category: "tls", status: "PASS" }],
      summary: {
        state: "FINAL",
        confidence: { level: "HIGH" },
        issues: [],
      },
    });
    const model = buildShareCardModel(partial, "ru", UI);
    expect(model.verdict).toBeUndefined();
    expect(model.score).toBeUndefined();
    expect(model.tone).toBe("neutral");
    // Something has to stand where the verdict would be, or the card looks like it lost it.
    expect(model.partialLabel).toBe(UI.sharePartial);
    // What it did check is still named.
    expect(model.categories.map((category) => category.name)).toEqual(["SSL/TLS"]);
  });
});

describe("PRD 13.6 — the card speaks the language of the page", () => {
  it.each(["ru", "uz", "en"] as const)("resolves every label in %s", (language) => {
    const model = buildShareCardModel(scan(), language, CHROME[language].ui);
    expect(model.verdict).toBeDefined();
    expect(model.confidence).not.toBe("");
    for (const category of model.categories) {
      expect(category.name).not.toMatch(/^category\./);
      expect(category.status).not.toMatch(/^[A-Z_]+$/);
    }
    for (const issue of model.issues) {
      expect(issue.title).not.toMatch(/\.fail$/);
      expect(issue.title).not.toMatch(/\{\w+\}/);
    }
  });
});

/**
 * A card that only says "fine" asks the reader to take it on faith. It has to say what was
 * looked at, and when.
 */
describe("the card says what was checked, not only that it was", () => {
  it("reports how much of each category passed", () => {
    const model = buildShareCardModel(scan(), "ru", UI);
    expect(
      model.categories.map((category) => [category.name, category.passed, category.total]),
    ).toEqual([
      ["DNS", 2, 3],
      ["Домен", 0, 1],
      // A check that does not apply counts in neither column.
      ["SSL/TLS", 1, 1],
    ]);
  });

  it("colours each category by its own outcome, not by the overall verdict", () => {
    const model = buildShareCardModel(scan(), "ru", UI);
    expect(model.categories.map((category) => category.tone)).toEqual(["fail", "warn", "pass"]);
  });

  it("carries the moment the checks were made", () => {
    const model = buildShareCardModel(scan(), "ru", UI);
    expect(model.checkedAt).toContain("Проверено");
    expect(model.checkedAt).toMatch(/\d/);
  });

  it("has no moment to show when the scan never recorded one", () => {
    const withoutTime = scan({ completedAt: undefined, categories: [] });
    expect(buildShareCardModel(withoutTime, "ru", UI).checkedAt).toBeUndefined();
  });
});
