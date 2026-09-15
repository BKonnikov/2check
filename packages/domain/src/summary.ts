import type {
  CategoryResult,
  CheckResult,
  Confidence,
  DomainHealthSummary,
  Issue,
  IssueSeverity,
  ScanCategory,
  ScanMode,
  ScanState,
  ScoreBreakdown,
  ScorePenalty,
  VerdictCode,
} from "@2check/contracts";

/** PRD 12.3 — recommended default penalties; the values are configuration. */
export const DEFAULT_ISSUE_PENALTIES: Readonly<Record<IssueSeverity, number>> = {
  critical: 25,
  warning: 8,
  informational: 2,
};

/**
 * PRD 11.2 — one root defect is one Issue and one penalty.
 * A group names the checks that are the same defect seen from several angles; every other FAIL
 * stands on its own. Grouping across categories is rejected at configuration validation.
 */
export interface IssueGroup {
  readonly issueId: string;
  readonly category: ScanCategory;
  readonly primaryCheckId: string;
  readonly checkIds: readonly string[];
}

/**
 * PRD 11.2, AC-11.4 and §26.8 — the default grouping.
 *
 * Without it every FAIL becomes its own Issue and its own penalty, and one root defect is
 * counted several times: a host that refuses TLS on both address families loses fifty points
 * for one fault, and a zone caught mid-change loses eight for every record type that differs.
 * Each group here is one defect seen from several angles, and never reaches across a category
 * (AC-11.3). The certificate checks are deliberately absent: an expired certificate, a name it
 * does not cover and an untrusted chain are three different faults, not three views of one.
 */
export const DEFAULT_ISSUE_GROUPS: readonly IssueGroup[] = [
  {
    issueId: "tls.connection",
    category: "tls",
    primaryCheckId: "tls.connection.ipv4",
    checkIds: ["tls.connection.ipv4", "tls.connection.ipv6"],
  },
  {
    issueId: "dns.record.consistency",
    category: "dns",
    primaryCheckId: "dns.a.consistency",
    checkIds: [
      "dns.a.consistency",
      "dns.aaaa.consistency",
      "dns.mx.consistency",
      "dns.txt.consistency",
      "dns.ns.consistency",
      "dns.cname.consistency",
      "dns.soa.consistency",
    ],
  },
];

export function validateIssueGroups(groups: readonly IssueGroup[]): void {
  for (const group of groups) {
    if (!group.checkIds.includes(group.primaryCheckId)) {
      throw new Error(`Issue group ${group.issueId} does not contain its primary check`);
    }
  }
  /**
   * AC-11.3 — grouping across categories is rejected at configuration validation. A checkId is
   * prefixed with its category, so a member that does not carry the group's category prefix
   * belongs to another one; narrowing it silently would emit the same issueId twice.
   */
  for (const group of groups) {
    for (const checkId of group.checkIds) {
      if (!checkId.startsWith(`${group.category}.`)) {
        throw new Error(
          `Issue group ${group.issueId} of category ${group.category} claims ${checkId}`,
        );
      }
    }
  }
  const seen = new Map<string, string>();
  for (const group of groups) {
    for (const checkId of group.checkIds) {
      const owner = seen.get(checkId);
      if (owner !== undefined && owner !== group.issueId) {
        throw new Error(`Check ${checkId} belongs to more than one issue group`);
      }
      seen.set(checkId, group.issueId);
    }
  }
}

function strongest(severities: readonly IssueSeverity[]): IssueSeverity {
  for (const candidate of ["critical", "warning", "informational"] as const) {
    if (severities.includes(candidate)) {
      return candidate;
    }
  }
  return "informational";
}

/**
 * PRD 11.1–11.2 and AC-11.1, AC-11.2 — Issues come only from FAIL.
 * UNKNOWN and N/A never produce one, so an unreachable resolver cannot look like a domain problem.
 * AC-11.3 — a group may only ever collect checks of a single category.
 */
export function buildIssues(
  categories: readonly CategoryResult[],
  groups: readonly IssueGroup[] = [],
): Issue[] {
  validateIssueGroups(groups);

  const issues: Issue[] = [];
  for (const category of categories) {
    const failed = category.checks.filter(
      (check): check is CheckResult & { severity: IssueSeverity } =>
        check.status === "FAIL" && check.severity !== "none",
    );
    const claimed = new Set<string>();

    for (const group of groups) {
      if (group.category !== category.category) {
        continue;
      }
      const members = failed.filter((check) => group.checkIds.includes(check.checkId));
      if (members.length === 0) {
        continue;
      }
      for (const member of members) {
        claimed.add(member.checkId);
      }
      const primary = members.find((check) => check.checkId === group.primaryCheckId) ?? members[0];
      issues.push({
        issueId: group.issueId,
        category: category.category,
        // PRD 11.2 — the Issue carries the strongest severity among the failing checks it covers.
        severity: strongest(members.map((check) => check.severity)),
        primaryCheckId: primary?.checkId ?? group.primaryCheckId,
        relatedCheckIds: members
          .map((check) => check.checkId)
          .filter((id) => id !== primary?.checkId),
        message: primary?.message ?? { titleCode: `${group.issueId}.fail` },
      });
    }

    for (const check of failed) {
      if (claimed.has(check.checkId)) {
        continue;
      }
      issues.push({
        issueId: check.checkId,
        category: category.category,
        severity: check.severity,
        primaryCheckId: check.checkId,
        relatedCheckIds: [],
        message: check.message,
      });
    }
  }
  return issues;
}

/**
 * PRD 11.4 and AC-11.5 — confidence is HIGH if and only if no visible result is UNKNOWN.
 * affectedCategories is exactly the set of categories whose completeness is PARTIAL.
 */
export function buildConfidence(categories: readonly CategoryResult[]): Confidence {
  const unknownChecksCount = categories.reduce(
    (total, category) =>
      total + category.checks.filter((check) => check.status === "UNKNOWN").length,
    0,
  );
  const affectedCategories = categories
    .filter((category) => category.completeness === "PARTIAL")
    .map((category) => category.category);

  return {
    level: unknownChecksCount === 0 ? "HIGH" : "REDUCED",
    unknownChecksCount,
    affectedCategories,
  };
}

/**
 * PRD 11.5 — the verdict.
 * Reduced confidence never hides a confirmed problem, and an absence of problems under reduced
 * confidence is not health: it is an incomplete picture (AC-11.6).
 */
export function determineVerdict(issues: readonly Issue[], confidence: Confidence): VerdictCode {
  if (issues.some((issue) => issue.severity === "critical")) {
    return "CRITICAL_PROBLEM";
  }
  if (issues.some((issue) => issue.severity === "warning")) {
    return "PROBLEMS";
  }
  if (issues.length > 0) {
    return "RECOMMENDATIONS";
  }
  return confidence.level === "HIGH" ? "HEALTHY" : "NO_CONFIRMED_ISSUES_INCOMPLETE";
}

/**
 * PRD 12.2–12.4 — the score is computed from deduplicated Issues, never from raw FAIL checks,
 * and PASS, UNKNOWN and N/A carry no penalty. Reduced confidence does not lower the number
 * (AC-12.5); it is reported separately as confidence.
 */
export function calculateScore(
  issues: readonly Issue[],
  penalties: Readonly<Record<IssueSeverity, number>> = DEFAULT_ISSUE_PENALTIES,
): ScoreBreakdown {
  const applied: ScorePenalty[] = issues.map((issue) => ({
    issueId: issue.issueId,
    severity: issue.severity,
    points: penalties[issue.severity],
  }));
  const totalPenalty = applied.reduce((sum, penalty) => sum + penalty.points, 0);

  return {
    baseScore: 100,
    penalties: applied,
    totalPenalty,
    // AC-12.4 — the score never falls below zero.
    finalScore: Math.max(0, 100 - totalPenalty),
  };
}

export interface SummaryOptions {
  readonly mode: ScanMode;
  readonly state: ScanState;
  readonly groups?: readonly IssueGroup[];
  readonly penalties?: Readonly<Record<IssueSeverity, number>>;
  readonly generatedAt?: string;
}

/**
 * PRD 11.3 and 16.8 — the deterministic server-side assembly:
 * checks → categories → issues → confidence → verdict → score.
 * AC-12.1 — a numeric score exists only for a FULL scan that has reached FINAL.
 */
export function buildSummary(
  categories: readonly CategoryResult[],
  options: SummaryOptions,
): DomainHealthSummary {
  const issues = buildIssues(categories, options.groups ?? []);
  const confidence = buildConfidence(categories);
  /**
   * AC-3.5 and AC-12.1 — an overall verdict and an overall score are statements about the whole
   * domain, so both belong to a FULL scan that has reached FINAL. A PARTIAL scan has looked at
   * one category; calling that "healthy" would be a claim about the two it never ran.
   */
  const overall = options.mode === "FULL" && options.state === "FINAL";
  const breakdown = overall ? calculateScore(issues, options.penalties) : undefined;

  const issueCounts = {
    critical: issues.filter((issue) => issue.severity === "critical").length,
    warning: issues.filter((issue) => issue.severity === "warning").length,
    informational: issues.filter((issue) => issue.severity === "informational").length,
  };

  return {
    state: options.state,
    ...(overall ? { verdictCode: determineVerdict(issues, confidence) } : {}),
    ...(breakdown === undefined ? {} : { score: breakdown.finalScore, scoreBreakdown: breakdown }),
    confidence,
    issueCounts,
    issues,
    categories: categories.map((category) => category.category),
    generatedAt: options.generatedAt ?? new Date().toISOString(),
  };
}
