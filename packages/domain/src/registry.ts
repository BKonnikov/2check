import type {
  CheckFreshness,
  CheckResult,
  NormalizedDomainRegistration,
  RegistrantField,
  RegistrationStatus,
  RegistryCheckSource,
  RegistryOutcome,
  RegistryTransport,
  Severity,
} from "@2check/contracts";

/**
 * PRD 9.3 — mapping from a provider's own wording to the canonical lifecycle.
 * Order is precedence: a domain carrying several statuses is described by the first match,
 * so a redemption period is never flattened into a plain "active".
 */
const STATUS_RULES: readonly (readonly [RegistrationStatus, readonly string[]])[] = [
  ["REDEMPTION_PERIOD", ["redemption", "redemptionperiod", "pending restore"]],
  ["CANCELLED", ["pending delete", "pendingdelete", "cancelled", "canceled", "deleted"]],
  ["AUCTION", ["auction"]],
  ["RESERVED", ["reserved", "blocked", "restricted"]],
  ["PENDING_RENEWAL", ["pending renew", "pendingrenew", "grace", "autorenewperiod"]],
  ["REGISTRATION_INITIATED", ["pending create", "pendingcreate", "registration initiated"]],
  ["PENDING_ACTIVATION", ["pending activation", "pendingactivation", "pending transfer"]],
  ["FREE", ["free", "available", "not registered", "no object found"]],
  ["DEACTIVATED", ["inactive", "hold", "suspended", "deactivated"]],
  ["ACTIVE", ["active", "ok", "connected", "clientupdateprohibited", "client update prohibited"]],
];

/** PRD 9.4 — an unrecognized status is UNKNOWN, never guessed into a neighbouring one. */
export function normalizeRegistrationStatus(rawStatus: readonly string[]): RegistrationStatus {
  const normalized = rawStatus.map((value) => value.trim().toLowerCase()).filter((v) => v !== "");
  for (const [status, needles] of STATUS_RULES) {
    if (normalized.some((value) => needles.some((needle) => value.includes(needle)))) {
      return status;
    }
  }
  return "UNKNOWN";
}

const REDACTION_PATTERN =
  /redact|not disclosed|withheld|privacy|data protected|gdpr masked|non-public/i;

function fieldFrom(value: string | undefined, redactedByPolicy: boolean): RegistrantField {
  if (redactedByPolicy) {
    return { state: "redacted" };
  }
  if (value === undefined || value.trim() === "") {
    return { state: "unavailable" };
  }
  return REDACTION_PATTERN.test(value) ? { state: "redacted" } : { state: "value" };
}

interface RdapEvent {
  readonly eventAction?: string;
  readonly eventDate?: string;
}

interface RdapEntity {
  readonly roles?: readonly string[];
  readonly vcardArray?: unknown;
}

interface RdapDomain {
  readonly ldhName?: string;
  readonly unicodeName?: string;
  readonly status?: readonly string[];
  readonly events?: readonly RdapEvent[];
  readonly nameservers?: readonly { readonly ldhName?: string }[];
  readonly entities?: readonly RdapEntity[];
  readonly redacted?: readonly { readonly name?: { readonly type?: string } }[];
}

/** Reads one property out of the jCard array of RFC 7095, e.g. ["fn", {}, "text", "Name"]. */
function vcardValue(vcardArray: unknown, property: string): string | undefined {
  if (!Array.isArray(vcardArray) || !Array.isArray(vcardArray[1])) {
    return undefined;
  }
  for (const entry of vcardArray[1] as unknown[]) {
    if (!Array.isArray(entry) || entry[0] !== property) {
      continue;
    }
    const value = entry[3];
    if (typeof value === "string") {
      return value;
    }
    if (Array.isArray(value)) {
      return value.filter((part) => typeof part === "string" && part !== "").join(", ");
    }
  }
  return undefined;
}

function eventDate(events: readonly RdapEvent[] | undefined, action: string): string | null {
  const match = events?.find((event) => event.eventAction?.toLowerCase() === action);
  return match?.eventDate ?? null;
}

/**
 * PRD 9.4 — normalize an RDAP domain object.
 * Returns null when the payload is not a usable domain object: an unusable response is
 * indeterminate (PRD 9.2), never evidence that the domain is free.
 */
export function normalizeRdapDomain(
  payload: unknown,
  freshness: CheckFreshness,
): NormalizedDomainRegistration | null {
  if (typeof payload !== "object" || payload === null) {
    return null;
  }
  const domain = payload as RdapDomain;
  const registryDomain = domain.ldhName ?? domain.unicodeName;
  if (typeof registryDomain !== "string" || registryDomain === "") {
    return null;
  }

  const registrantEntity = domain.entities?.find((entity) =>
    entity.roles?.some((role) => role.toLowerCase() === "registrant"),
  );
  const registrarEntity = domain.entities?.find((entity) =>
    entity.roles?.some((role) => role.toLowerCase() === "registrar"),
  );

  // RFC 9537 — a server may declare redacted members instead of omitting them.
  const redactedNames = new Set(
    (domain.redacted ?? [])
      .map((entry) => entry.name?.type?.toLowerCase())
      .filter((name): name is string => name !== undefined),
  );
  const declaredRedacted = (needle: string): boolean =>
    [...redactedNames].some((name) => name.includes(needle));

  const rawStatus = domain.status ?? [];

  return {
    registryDomain: registryDomain.replace(/\.$/, ""),
    registrar:
      vcardValue(registrarEntity?.vcardArray, "fn") ??
      vcardValue(registrarEntity?.vcardArray, "org") ??
      null,
    createdAt: eventDate(domain.events, "registration"),
    expiresAt: eventDate(domain.events, "expiration"),
    nameServers: (domain.nameservers ?? [])
      .map((server) => server.ldhName?.replace(/\.$/, ""))
      .filter((name): name is string => name !== undefined && name !== ""),
    status: normalizeRegistrationStatus(rawStatus),
    rawStatus,
    registrant: {
      name: fieldFrom(vcardValue(registrantEntity?.vcardArray, "fn"), declaredRedacted("name")),
      email: fieldFrom(
        vcardValue(registrantEntity?.vcardArray, "email"),
        declaredRedacted("email"),
      ),
      phone: fieldFrom(vcardValue(registrantEntity?.vcardArray, "tel"), declaredRedacted("phone")),
      address: fieldFrom(
        vcardValue(registrantEntity?.vcardArray, "adr"),
        declaredRedacted("address"),
      ),
    },
    freshness,
  };
}

const WHOIS_NOT_FOUND =
  /\b(no match|not found|no entries found|no data found|nothing found|domain not found|no object found)\b/i;

const WHOIS_KEYS: Readonly<Record<string, readonly string[]>> = {
  registryDomain: ["domain name", "domain"],
  registrar: ["registrar", "registrar name", "sponsoring registrar"],
  createdAt: ["creation date", "created", "created on", "registered on", "registration date"],
  expiresAt: [
    "expiration date",
    "expiry date",
    "expires",
    "expires on",
    "paid-till",
    "registry expiry date",
  ],
  status: ["status", "domain status"],
  nameServer: ["name server", "nameserver", "nserver", "dns"],
  registrantName: ["registrant name", "registrant", "owner", "organization"],
  registrantEmail: ["registrant email", "email", "e-mail"],
  registrantPhone: ["registrant phone", "phone", "phone number"],
  registrantAddress: ["registrant address", "address", "registrant street"],
};

function collectWhoisValues(lines: readonly string[], keys: readonly string[]): string[] {
  const values: string[] = [];
  for (const line of lines) {
    const separator = line.indexOf(":");
    if (separator <= 0) {
      continue;
    }
    const key = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();
    if (value !== "" && keys.includes(key)) {
      values.push(value);
    }
  }
  return values;
}

/**
 * Generic key/value WHOIS reader.
 *
 * WHOIS has no schema, so this recognizes the field names in common use. The exact labels of the
 * .uz registry are not confirmed against a live response yet, and an unrecognized layout yields
 * null — which is indeterminate, not free (AC-9.3).
 */
export function parseWhoisRecord(
  text: string,
  freshness: CheckFreshness,
): { readonly registration: NormalizedDomainRegistration | null; readonly notFound: boolean } {
  if (WHOIS_NOT_FOUND.test(text)) {
    return { registration: null, notFound: true };
  }

  const lines = text.split(/\r?\n/);
  const first = (field: string): string | undefined =>
    collectWhoisValues(lines, WHOIS_KEYS[field] ?? [])[0];

  const registryDomain = first("registryDomain");
  if (registryDomain === undefined) {
    return { registration: null, notFound: false };
  }

  const rawStatus = collectWhoisValues(lines, WHOIS_KEYS.status ?? []);

  return {
    registration: {
      registryDomain: registryDomain.toLowerCase().replace(/\.$/, ""),
      registrar: first("registrar") ?? null,
      createdAt: first("createdAt") ?? null,
      expiresAt: first("expiresAt") ?? null,
      nameServers: collectWhoisValues(lines, WHOIS_KEYS.nameServer ?? []).map(
        (value) => value.split(/\s+/)[0]?.toLowerCase().replace(/\.$/, "") ?? value,
      ),
      status: normalizeRegistrationStatus(rawStatus),
      rawStatus,
      registrant: {
        name: fieldFrom(first("registrantName"), false),
        email: fieldFrom(first("registrantEmail"), false),
        phone: fieldFrom(first("registrantPhone"), false),
        address: fieldFrom(first("registrantAddress"), false),
      },
      freshness,
    },
    notFound: false,
  };
}

export interface TransportAttempt {
  readonly transport: RegistryTransport;
  readonly registration: NormalizedDomainRegistration | null;
  /** True only when the authoritative source explicitly said the domain is not registered. */
  readonly confirmedNotRegistered: boolean;
}

export interface RegistryLookupResolution {
  readonly outcome: RegistryOutcome;
  readonly registration: NormalizedDomainRegistration | null;
  readonly transportsUsed: readonly RegistryTransport[];
}

/**
 * PRD 9.1–9.2 — RDAP decides when it is determinate; WHOIS is consulted only after RDAP was not.
 * NOT_REGISTERED needs an explicit confirmation, so a timeout, a malformed body or a parse failure
 * ends as INDETERMINATE rather than as a free domain (AC-9.2, AC-9.3).
 */
export function resolveRegistryLookup(
  attempts: readonly TransportAttempt[],
): RegistryLookupResolution {
  const transportsUsed: RegistryTransport[] = [];
  for (const attempt of attempts) {
    transportsUsed.push(attempt.transport);
    if (attempt.registration !== null) {
      return { outcome: "REGISTERED", registration: attempt.registration, transportsUsed };
    }
    if (attempt.confirmedNotRegistered) {
      return { outcome: "NOT_REGISTERED", registration: null, transportsUsed };
    }
  }
  return { outcome: "INDETERMINATE", registration: null, transportsUsed };
}

/**
 * PRD 9.7 — a status-aware TTL. Active registrations move slowly and are cached in hours;
 * grace and redemption states change under time pressure and are cached in minutes.
 * The values are a default policy and belong to versioned configuration.
 */
export const DEFAULT_REGISTRY_TTL_SECONDS: Readonly<Record<RegistrationStatus, number>> = {
  ACTIVE: 6 * 3600,
  RESERVED: 6 * 3600,
  DEACTIVATED: 3600,
  CANCELLED: 3600,
  FREE: 900,
  PENDING_RENEWAL: 300,
  REDEMPTION_PERIOD: 300,
  REGISTRATION_INITIATED: 300,
  PENDING_ACTIVATION: 300,
  AUCTION: 300,
  UNKNOWN: 300,
};

export function registrationCacheTtlSeconds(
  status: RegistrationStatus,
  policy: Readonly<Record<RegistrationStatus, number>> = DEFAULT_REGISTRY_TTL_SECONDS,
): number {
  return policy[status];
}

export interface RegistryEvaluationOptions {
  readonly registryDomain: string;
  readonly registryProvider: string;
  /** PRD 9.6 — false when the TLD is outside the provider's zone. */
  readonly supported: boolean;
  readonly freshness: CheckFreshness;
}

/**
 * PRD 9.5–9.6 — the root registry check.
 * An unsupported zone is UNKNOWN/provider_not_supported with no source, because no external
 * provider was contacted and no score penalty is applied.
 */
export function evaluateRegistryLookup(
  resolution: RegistryLookupResolution,
  options: RegistryEvaluationOptions,
): CheckResult<NormalizedDomainRegistration | null> {
  const checkId = "registry.lookup";
  const target = { kind: "REGISTRY_DOMAIN", registryDomain: options.registryDomain } as const;

  if (!options.supported) {
    return {
      checkId,
      category: "registry",
      status: "UNKNOWN",
      severity: "none" as Severity,
      target,
      reasonCode: "provider_not_supported",
      message: { titleCode: "registry.lookup.provider_not_supported" },
      freshness: options.freshness,
    };
  }

  const source: RegistryCheckSource = {
    kind: "REGISTRY_PROVIDER",
    registryProvider: options.registryProvider,
    transportsUsed: resolution.transportsUsed,
  };

  if (resolution.outcome === "REGISTERED") {
    return {
      checkId,
      category: "registry",
      status: "PASS",
      severity: "none" as Severity,
      target,
      message: { titleCode: "registry.lookup.registered" },
      details: resolution.registration,
      source,
      freshness: options.freshness,
    };
  }

  if (resolution.outcome === "NOT_REGISTERED") {
    return {
      checkId,
      category: "registry",
      status: "FAIL",
      severity: "critical" as Severity,
      target,
      message: { titleCode: "registry.lookup.not_registered" },
      source,
      freshness: options.freshness,
    };
  }

  return {
    checkId,
    category: "registry",
    status: "UNKNOWN",
    severity: "none" as Severity,
    target,
    reasonCode: "registry_lookup_indeterminate",
    message: { titleCode: "registry.lookup.indeterminate" },
    source,
    freshness: options.freshness,
  };
}
