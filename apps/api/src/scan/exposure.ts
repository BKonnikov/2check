import type {
  CategoryResult,
  CheckResult,
  PublicCategoryResult,
  PublicCheckResult,
  RegistrantField,
  ScanCategory,
  TechnicalCheckDetail,
} from "@2check/contracts";

/**
 * PRD 6.4 — projections between the internal DTO and the two exposure levels it may be seen at.
 *
 * Both projections are written as explicit field lists rather than as omissions. A field that
 * nobody named here does not travel, so adding one to an internal type cannot publish it by
 * accident; publishing is always a deliberate edit to this file.
 */

/** PRD 6.4 — the Public level of one check. */
export function toPublicCheck(check: CheckResult): PublicCheckResult {
  return {
    checkId: check.checkId,
    category: check.category,
    status: check.status,
    severity: check.severity,
    ...(check.reasonCode === undefined ? {} : { reasonCode: check.reasonCode }),
    ...(check.dependsOn === undefined ? {} : { dependsOn: check.dependsOn }),
    ...(check.dependencyMode === undefined ? {} : { dependencyMode: check.dependencyMode }),
    ...(check.blockedBy === undefined ? {} : { blockedBy: check.blockedBy }),
    message: check.message,
    freshness: check.freshness,
  };
}

export function toPublicCategories(
  categories: readonly CategoryResult[],
): readonly PublicCategoryResult[] {
  return categories.map((category) => ({
    category: category.category,
    status: category.status,
    severity: category.severity,
    completeness: category.completeness,
    checks: category.checks.map(toPublicCheck),
  }));
}

/**
 * PRD 23.6 — the permitted detail fields, per category. Everything a module puts in `details`
 * that is not named here stays inside the service.
 */
const PERMITTED_DETAIL_FIELDS: Readonly<Record<ScanCategory, readonly string[]>> = {
  // PRD 8.3 — what each resolver saw, and whether their answers agreed.
  dns: ["state", "providerStates", "answersByProvider", "valueVariation", "recognisedServices"],
  // PRD 9.4 — registration facts. `registrant` is rebuilt below; its values never travel.
  registry: [
    "registryDomain",
    "registrar",
    "createdAt",
    "expiresAt",
    "updatedAt",
    "nameServers",
    "status",
    "rawStatus",
    "registrant",
  ],
  // PRD 10.5 — the certificate facts the MVP evaluates, and the endpoint each came from.
  tls: [
    "address",
    "protocol",
    "failureCode",
    "evaluatedFamilies",
    "daysRemaining",
    "validFrom",
    "validTo",
    "issuer",
    "subjectAltNames",
    "fingerprints",
    "fingerprintVariation",
    "chainErrorCode",
  ],
  /**
   * 1.1 §9.4 — what the mail category shows on an explicit request for the technical view.
   *
   * The section's table decides this list, and the line it draws is between what a reader needs
   * in order to act and what they need in order to check us: the policy's own values and the
   * hosts it names are Public, while the addresses those hosts resolved to, the records as
   * published, the names actually queried and the full report addresses are here.
   *
   * The certificate fields carry the names the TLS category already uses, because §7.5 reads a
   * mail host's certificate by the rules of 1.0 §10 and a reader should meet one vocabulary.
   */
  email: [
    "recordText",
    "triedNames",
    "keyBits",
    "reportAddresses",
    "hosts",
    "addresses",
    "address",
    "protocol",
    "hostsNotProbed",
    "validFrom",
    "validTo",
    "issuer",
    "subjectAltNames",
    "chainErrorCode",
  ],
};

const REGISTRANT_FIELDS = ["name", "email", "phone", "address"] as const;

/**
 * PRD 9.4 and AC-25.1 — only the state of a registrant field is exposed, never its value.
 * The subtree is rebuilt field by field rather than copied, so a value added upstream cannot
 * ride along inside it.
 */
function projectRegistrant(value: unknown): Readonly<Record<string, RegistrantField>> | undefined {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }
  const source = value as Record<string, unknown>;
  const projected: Record<string, RegistrantField> = {};
  for (const field of REGISTRANT_FIELDS) {
    const entry = source[field];
    if (typeof entry === "object" && entry !== null) {
      const state = (entry as Record<string, unknown>).state;
      if (state === "value" || state === "redacted" || state === "unavailable") {
        projected[field] = { state };
      }
    }
  }
  return Object.keys(projected).length === 0 ? undefined : projected;
}

function projectDetails(
  category: ScanCategory,
  details: unknown,
): Readonly<Record<string, unknown>> | undefined {
  if (typeof details !== "object" || details === null) {
    return undefined;
  }
  const source = details as Record<string, unknown>;
  const projected: Record<string, unknown> = {};
  for (const field of PERMITTED_DETAIL_FIELDS[category]) {
    const value = source[field];
    if (value === undefined) {
      continue;
    }
    if (field === "registrant") {
      const registrant = projectRegistrant(value);
      if (registrant !== undefined) {
        projected[field] = registrant;
      }
      continue;
    }
    projected[field] = value;
  }
  return Object.keys(projected).length === 0 ? undefined : projected;
}

/** PRD 6.4 and 17.1 — the Technical level, as served by /details. */
export function toTechnicalDetails(
  categories: readonly CategoryResult[],
): readonly TechnicalCheckDetail[] {
  return categories.flatMap((category) =>
    category.checks.map((check) => {
      const details = projectDetails(category.category, check.details);
      return {
        checkId: check.checkId,
        category: check.category,
        target: check.target,
        ...(check.source === undefined ? {} : { source: check.source }),
        ...(details === undefined ? {} : { details }),
      };
    }),
  );
}
