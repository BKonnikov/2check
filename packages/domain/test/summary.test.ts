import type {
  CategoryResult,
  CheckResult,
  CheckStatus,
  ScanCategory,
  Severity,
} from "@2check/contracts";
import { describe, expect, it } from "vitest";
import {
  buildConfidence,
  buildIssues,
  buildSummary,
  calculateScore,
  DEFAULT_ISSUE_GROUPS,
  DEFAULT_ISSUE_PENALTIES,
  determineVerdict,
  validateIssueGroups,
} from "../src/summary.js";

function check(checkId: string, status: CheckStatus, severity: Severity = "none"): CheckResult {
  return {
    checkId,
    category: "dns",
    status,
    severity,
    target: { kind: "DNS_NAME", qname: "example.uz" },
    message: { titleCode: `${checkId}.${status.toLowerCase()}` },
    freshness: { checkedAt: "2026-09-15T00:00:00.000Z", cached: false, cacheAge: 0 },
  };
}

function category(
  name: ScanCategory,
  checks: readonly CheckResult[],
  completeness: "COMPLETE" | "PARTIAL" = "COMPLETE",
): CategoryResult {
  return { category: name, status: "PASS", severity: "none", completeness, checks };
}

describe("AC-11.1 and AC-11.2 — Issues come only from FAIL", () => {
  it("creates one issue per failing check", () => {
    const issues = buildIssues([
      category("dns", [check("a", "FAIL", "critical"), check("b", "PASS")]),
    ]);
    expect(issues).toHaveLength(1);
    expect(issues[0]?.primaryCheckId).toBe("a");
    expect(issues[0]?.severity).toBe("critical");
  });

  it("never creates an issue from UNKNOWN or N/A", () => {
    const issues = buildIssues([
      category("dns", [check("a", "UNKNOWN"), check("b", "NOT_APPLICABLE"), check("c", "PASS")]),
    ]);
    expect(issues).toEqual([]);
  });
});

describe("AC-11.3 and AC-11.4 — one root defect, one issue", () => {
  const groups = [
    {
      issueId: "dns.name.missing",
      category: "dns" as const,
      primaryCheckId: "dns.name.existence",
      checkIds: ["dns.name.existence", "dns.a.consistency"],
    },
  ];

  it("merges grouped checks of one category into a single issue", () => {
    const issues = buildIssues(
      [
        category("dns", [
          check("dns.name.existence", "FAIL", "critical"),
          check("dns.a.consistency", "FAIL", "warning"),
        ]),
      ],
      groups,
    );
    expect(issues).toHaveLength(1);
    expect(issues[0]?.issueId).toBe("dns.name.missing");
    expect(issues[0]?.severity).toBe("critical");
    expect(issues[0]?.relatedCheckIds).toEqual(["dns.a.consistency"]);
  });

  it("does not let a group reach into another category", () => {
    const issues = buildIssues(
      [
        category("dns", [check("dns.name.existence", "FAIL", "critical")]),
        category("tls", [check("dns.a.consistency", "FAIL", "warning")]),
      ],
      groups,
    );
    expect(issues).toHaveLength(2);
    expect(issues.map((issue) => issue.category)).toEqual(["dns", "tls"]);
  });

  /**
   * AC-11.3 — grouping across categories is rejected at configuration validation, not narrowed
   * silently at assembly time: a group applied to two categories would emit one issueId twice.
   */
  it("rejects a group that claims a check from another category", () => {
    expect(() =>
      validateIssueGroups([
        {
          issueId: "mixed",
          category: "dns",
          primaryCheckId: "dns.a.consistency",
          checkIds: ["dns.a.consistency", "tls.connection.ipv4"],
        },
      ]),
    ).toThrow(/claims tls\.connection\.ipv4/);
  });

  it("accepts the grouping the product actually ships", () => {
    expect(() => validateIssueGroups(DEFAULT_ISSUE_GROUPS)).not.toThrow();
  });

  it("rejects a configuration where one check belongs to two issues", () => {
    expect(() =>
      validateIssueGroups([
        { issueId: "one", category: "dns", primaryCheckId: "dns.x", checkIds: ["dns.x"] },
        { issueId: "two", category: "dns", primaryCheckId: "dns.x", checkIds: ["dns.x"] },
      ]),
    ).toThrow(/more than one issue group/);
  });

  it("rejects a group that does not contain its own primary check", () => {
    expect(() =>
      validateIssueGroups([
        { issueId: "one", category: "dns", primaryCheckId: "missing", checkIds: ["x"] },
      ]),
    ).toThrow(/primary check/);
  });
});

describe("AC-11.5 — confidence", () => {
  it("is HIGH only when no visible result is UNKNOWN", () => {
    expect(buildConfidence([category("dns", [check("a", "PASS")])]).level).toBe("HIGH");
    expect(
      buildConfidence([category("dns", [check("a", "PASS"), check("b", "UNKNOWN")], "PARTIAL")])
        .level,
    ).toBe("REDUCED");
  });

  it("reports exactly the categories whose completeness is PARTIAL", () => {
    const confidence = buildConfidence([
      category("dns", [check("a", "UNKNOWN")], "PARTIAL"),
      category("tls", [check("b", "PASS")]),
    ]);
    expect(confidence.affectedCategories).toEqual(["dns"]);
    expect(confidence.unknownChecksCount).toBe(1);
  });
});

describe("PRD 11.5 — verdicts", () => {
  const high = { level: "HIGH" as const, unknownChecksCount: 0, affectedCategories: [] };
  const reduced = {
    level: "REDUCED" as const,
    unknownChecksCount: 1,
    affectedCategories: ["dns" as const],
  };
  const issue = (severity: "critical" | "warning" | "informational") => ({
    issueId: severity,
    category: "dns" as const,
    severity,
    primaryCheckId: "x",
    relatedCheckIds: [],
    message: { titleCode: "x" },
  });

  it("is HEALTHY only with no issues and full confidence", () => {
    expect(determineVerdict([], high)).toBe("HEALTHY");
  });

  it("AC-11.6 — no issues under reduced confidence is not health", () => {
    expect(determineVerdict([], reduced)).toBe("NO_CONFIRMED_ISSUES_INCOMPLETE");
  });

  it.each([
    [["informational"], "RECOMMENDATIONS"],
    [["warning"], "PROBLEMS"],
    [["warning", "informational"], "PROBLEMS"],
    [["critical", "warning"], "CRITICAL_PROBLEM"],
  ])("maps %j to %s", (severities, expected) => {
    const issues = (severities as ("critical" | "warning" | "informational")[]).map(issue);
    expect(determineVerdict(issues, high)).toBe(expected);
  });

  it("does not let reduced confidence hide a confirmed problem", () => {
    expect(determineVerdict([issue("critical")], reduced)).toBe("CRITICAL_PROBLEM");
  });
});

describe("PRD 12 — the score", () => {
  const issue = (issueId: string, severity: "critical" | "warning" | "informational") => ({
    issueId,
    category: "dns" as const,
    severity,
    primaryCheckId: issueId,
    relatedCheckIds: [],
    message: { titleCode: issueId },
  });

  it("applies the default penalties per issue", () => {
    const breakdown = calculateScore([issue("a", "critical"), issue("b", "warning")]);
    expect(breakdown.totalPenalty).toBe(
      DEFAULT_ISSUE_PENALTIES.critical + DEFAULT_ISSUE_PENALTIES.warning,
    );
    expect(breakdown.finalScore).toBe(67);
    expect(breakdown.baseScore).toBe(100);
  });

  it("AC-12.4 — never falls below zero", () => {
    const many = Array.from({ length: 10 }, (_, index) => issue(`i${index}`, "critical"));
    expect(calculateScore(many).finalScore).toBe(0);
  });

  it("AC-12.3 — scores from issues, so UNKNOWN and N/A cost nothing", () => {
    const summary = buildSummary(
      [category("dns", [check("a", "UNKNOWN"), check("b", "NOT_APPLICABLE")], "PARTIAL")],
      { mode: "FULL", state: "FINAL" },
    );
    expect(summary.score).toBe(100);
  });

  it("AC-12.5 and AC-11.7 — a perfect score under reduced confidence is not HEALTHY", () => {
    const summary = buildSummary([category("dns", [check("a", "UNKNOWN")], "PARTIAL")], {
      mode: "FULL",
      state: "FINAL",
    });
    expect(summary.score).toBe(100);
    expect(summary.confidence.level).toBe("REDUCED");
    expect(summary.verdictCode).toBe("NO_CONFIRMED_ISSUES_INCOMPLETE");
  });
});

describe("AC-12.1 — the score exists only for FULL and FINAL", () => {
  const categories = [category("dns", [check("a", "PASS")])];

  it.each([
    ["FULL", "PROVISIONAL"],
    ["PARTIAL", "FINAL"],
    ["PARTIAL", "PROVISIONAL"],
  ] as const)("omits the score for %s %s", (mode, state) => {
    const summary = buildSummary(categories, { mode, state });
    expect(summary.score).toBeUndefined();
    expect(summary.scoreBreakdown).toBeUndefined();
  });

  it("includes it for FULL FINAL", () => {
    const summary = buildSummary(categories, { mode: "FULL", state: "FINAL" });
    expect(summary.score).toBe(100);
    expect(summary.verdictCode).toBe("HEALTHY");
  });

  it("omits the verdict while the result is provisional", () => {
    expect(
      buildSummary(categories, { mode: "FULL", state: "PROVISIONAL" }).verdictCode,
    ).toBeUndefined();
  });
});

describe("PRD 11.3 — the summary", () => {
  it("counts issues by severity and lists the categories it covers", () => {
    const summary = buildSummary(
      [
        category("dns", [check("a", "FAIL", "critical")]),
        category("tls", [check("b", "FAIL", "warning"), check("c", "FAIL", "informational")]),
      ],
      { mode: "FULL", state: "FINAL", generatedAt: "2026-09-15T00:00:00.000Z" },
    );
    expect(summary.issueCounts).toEqual({ critical: 1, warning: 1, informational: 1 });
    expect(summary.categories).toEqual(["dns", "tls"]);
    expect(summary.issues).toHaveLength(3);
    expect(summary.score).toBe(100 - 25 - 8 - 2);
    expect(summary.generatedAt).toBe("2026-09-15T00:00:00.000Z");
  });
});

/**
 * 1.1 §10.3 and §10.4 — how the mail category enters the score.
 *
 * The checks here carry their real message codes, because the grouping of this category turns on
 * them: a check that can fail for several unrelated reasons must not have all of them collected
 * into one Issue.
 */
describe("1.1 §10 — the mail category in the summary", () => {
  function mail(checkId: string, titleCode: string, severity: Severity = "warning"): CheckResult {
    return {
      checkId,
      category: "email",
      status: "FAIL",
      severity,
      target: { kind: "EMAIL_POLICY", policy: "SPF", queriedName: "example.uz" },
      message: { titleCode },
      freshness: { checkedAt: "2026-10-06T00:00:00.000Z", cached: false, cacheAge: 0 },
    };
  }

  it("AC-10.4 — counts a domain with neither policy as one defect, not two", () => {
    const issues = buildIssues(
      [
        category("email", [
          mail("email.spf.record", "email.spf.record.fail.absent"),
          mail("email.dmarc.record", "email.dmarc.record.fail.absent"),
        ]),
      ],
      DEFAULT_ISSUE_GROUPS,
    );
    expect(issues).toHaveLength(1);
    expect(issues[0]?.issueId).toBe("email.policy.absent");
    expect(issues[0]?.primaryCheckId).toBe("email.spf.record");
    expect(issues[0]?.relatedCheckIds).toEqual(["email.dmarc.record"]);
    expect(calculateScore(issues, DEFAULT_ISSUE_PENALTIES).finalScore).toBe(
      100 - DEFAULT_ISSUE_PENALTIES.warning,
    );
  });

  it("keeps two policies broken in their own ways apart", () => {
    // §10.3 — errors of different published policies are grouped only on an established common
    // cause, and two records at one name has nothing to do with another policy being absent.
    const issues = buildIssues(
      [
        category("email", [
          mail("email.spf.record", "email.spf.record.fail.absent"),
          mail("email.dmarc.record", "email.dmarc.record.fail.multiple", "critical"),
        ]),
      ],
      DEFAULT_ISSUE_GROUPS,
    );
    expect(issues).toHaveLength(2);
    expect(issues.map((issue) => issue.issueId).sort()).toEqual([
      "email.dmarc.record",
      "email.policy.absent",
    ]);
  });

  it("AC-10.5 — a check blocked by a missing receiving server adds no issue of its own", () => {
    const blocked: CheckResult = {
      checkId: "email.starttls.encryption",
      category: "email",
      status: "NOT_APPLICABLE",
      severity: "none",
      target: { kind: "MAIL_HOST", hostname: "example.uz" },
      message: { titleCode: "email.starttls.encryption.blocked" },
      blockedBy: "email.mx.records",
      freshness: { checkedAt: "2026-10-06T00:00:00.000Z", cached: false, cacheAge: 0 },
    };
    const issues = buildIssues(
      [
        category("email", [
          mail("email.mx.records", "email.mx.records.fail.missing", "critical"),
          blocked,
        ]),
      ],
      DEFAULT_ISSUE_GROUPS,
    );
    expect(issues).toHaveLength(1);
    expect(issues[0]?.primaryCheckId).toBe("email.mx.records");
  });

  it("AC-10.6 — refuses a group that reaches across categories", () => {
    expect(() =>
      validateIssueGroups([
        {
          issueId: "email.and.dns",
          category: "email",
          primaryCheckId: "email.spf.record",
          checkIds: ["email.spf.record", "dns.txt.resolve"],
        },
      ]),
    ).toThrow(/claims dns.txt.resolve/);
  });

  it("refuses a group that lists no message it applies to", () => {
    expect(() =>
      validateIssueGroups([
        {
          issueId: "email.nothing",
          category: "email",
          primaryCheckId: "email.spf.record",
          checkIds: ["email.spf.record"],
          titleCodes: [],
        },
      ]),
    ).toThrow(/lists no message/);
  });

  it("AC-10.7 — an unknown selector leaves the category short of a confirmed verdict", () => {
    const unknown: CheckResult = {
      checkId: "email.dkim.key",
      category: "email",
      status: "UNKNOWN",
      severity: "none",
      reasonCode: "dkim_selector_unknown",
      target: { kind: "EMAIL_POLICY", policy: "DKIM", queriedName: "_domainkey.example.uz" },
      message: { titleCode: "email.dkim.key.unknown.selector" },
      freshness: { checkedAt: "2026-10-06T00:00:00.000Z", cached: false, cacheAge: 0 },
    };
    const summary = buildSummary([category("email", [unknown], "PARTIAL")], {
      mode: "FULL",
      state: "FINAL",
      groups: DEFAULT_ISSUE_GROUPS,
    });
    expect(summary.issues).toEqual([]);
    expect(summary.confidence.level).toBe("REDUCED");
    expect(summary.verdictCode).toBe("NO_CONFIRMED_ISSUES_INCOMPLETE");
  });
});
