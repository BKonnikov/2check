import type {
  CheckResult,
  EmailPolicyTarget,
  MessageDescriptor,
  Severity,
} from "@2check/contracts";

type MessageParams = NonNullable<MessageDescriptor["params"]>;

/**
 * 1.1 §5 — the DKIM key check.
 *
 * The selector is the part of the name a domain owner chooses, and DNS offers no way to list the
 * names under a zone: a name can only be asked for once you already know it. So this check is
 * bounded by what it was told to ask — the selector the user typed, and the selectors a
 * recognised mail service is known to use — and an empty answer is the end of what was asked,
 * never a statement that the domain has no DKIM.
 */

/** RFC 6376 §3.6.2 — the label a key record sits under. */
export const DKIM_KEY_LABEL = "_domainkey";

/** RFC 8301 — a verifier must not treat a signature by a shorter RSA key as valid. */
export const DKIM_MIN_RSA_BITS = 1024;

/** 1.1 §5.2 — the bound on one scan, so a long selector table cannot turn into a long walk. */
export const DKIM_MAX_SELECTORS_PER_SCAN = 8;

const VERSION_VALUE = "DKIM1";
const SHA1 = "sha1";

export function dkimKeyName(selector: string, domain: string): string {
  return `${selector}.${DKIM_KEY_LABEL}.${domain}`;
}

/** RFC 1035 §2.3.4 and §2.3.1 — one label, which is what 1.1 §14.2 accepts as a selector. */
const DNS_LABEL = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/;

/**
 * 1.1 §14.2 — a selector that is not a DNS label is refused before any query runs, rather than
 * turned into a lookup that was always going to find nothing.
 */
export function isDkimSelector(value: string): boolean {
  return DNS_LABEL.test(value);
}

/** Where a selector came from, which is what decides how its absence reads — 1.1 §5.5. */
export type DkimSelectorOrigin = "USER" | "SERVICE";

export interface DkimSelector {
  readonly selector: string;
  readonly origin: DkimSelectorOrigin;
}

/**
 * 1.1 §5.2 — the user's selector first, then the ones the recognised service is known to use.
 * Both sources are hints about where to look; neither claims the domain signs its mail.
 */
export function dkimSelectors(sources: {
  readonly provided?: string | undefined;
  readonly service?: readonly string[] | undefined;
}): readonly DkimSelector[] {
  const seen = new Set<string>();
  const selectors: DkimSelector[] = [];
  const add = (value: string, origin: DkimSelectorOrigin) => {
    const selector = value.trim().toLowerCase();
    if (selector === "" || seen.has(selector) || selectors.length >= DKIM_MAX_SELECTORS_PER_SCAN) {
      return;
    }
    seen.add(selector);
    selectors.push({ selector, origin });
  };
  if (sources.provided !== undefined) {
    add(sources.provided, "USER");
  }
  for (const selector of sources.service ?? []) {
    add(selector, "SERVICE");
  }
  return selectors;
}

export type DkimKeyType = "rsa" | "ed25519" | "other";

export interface DkimKey {
  readonly text: string;
  /** Tag names lowercased; where a name repeats, the first occurrence wins. */
  readonly tags: ReadonlyMap<string, string>;
  readonly keyType: DkimKeyType;
  /** RFC 6376 §3.6.1 — an empty `p` is a revoked key, not a missing one. */
  readonly revoked: boolean;
  /** The modulus length of an RSA key, where the key data could be read. */
  readonly bits?: number;
  /** RFC 6376 §3.6.1 — the `t=y` flag, which says the domain is still testing. */
  readonly testMode: boolean;
  /** RFC 8301 — a key that admits sha1 and nothing else. */
  readonly sha1Only: boolean;
}

const BASE64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/** Decoded by hand so the module needs neither a browser global nor a Node one. */
function fromBase64(value: string): Uint8Array | undefined {
  const clean = value.replace(/[\s=]/g, "");
  const bytes = new Uint8Array((clean.length * 3) >> 2);
  let accumulator = 0;
  let bits = 0;
  let written = 0;
  for (const character of clean) {
    const index = BASE64.indexOf(character);
    if (index < 0) {
      return undefined;
    }
    accumulator = (accumulator << 6) | index;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes[written] = (accumulator >> bits) & 0xff;
      written += 1;
    }
  }
  return bytes.subarray(0, written);
}

interface Der {
  readonly tag: number;
  readonly content: Uint8Array;
  readonly end: number;
}

/** Just enough DER to walk a public key: one tag, one length, one content range. */
function readDer(bytes: Uint8Array, start: number): Der | undefined {
  const tag = bytes[start];
  const first = bytes[start + 1];
  if (tag === undefined || first === undefined) {
    return undefined;
  }
  let length = first;
  let cursor = start + 2;
  if (first > 0x80) {
    const count = first & 0x7f;
    if (count > 4 || start + 2 + count > bytes.length) {
      return undefined;
    }
    length = 0;
    for (let index = 0; index < count; index += 1) {
      length = (length << 8) | (bytes[cursor] ?? 0);
      cursor += 1;
    }
  } else if (first === 0x80) {
    // Indefinite length is not valid DER.
    return undefined;
  }
  const end = cursor + length;
  return end > bytes.length ? undefined : { tag, content: bytes.subarray(cursor, end), end };
}

function integerBits(content: Uint8Array): number {
  let index = 0;
  while (index < content.length && content[index] === 0) {
    index += 1;
  }
  const head = content[index];
  if (head === undefined) {
    return 0;
  }
  let top = 8;
  while (top > 0 && head >> (top - 1) === 0) {
    top -= 1;
  }
  return (content.length - index - 1) * 8 + top;
}

/**
 * The modulus length of an RSA public key, which is what RFC 8301 sets its floor on.
 *
 * RFC 6376 §3.6.1 asks for the DER form of the key, and publishers write both shapes of it: a
 * SubjectPublicKeyInfo wrapping the key, and the bare RSAPublicKey. Both start with a SEQUENCE,
 * and what follows tells them apart — an INTEGER is the modulus itself, a SEQUENCE is the
 * algorithm identifier of the wrapper.
 */
export function rsaKeyBits(keyData: string): number | undefined {
  const bytes = fromBase64(keyData);
  if (bytes === undefined) {
    return undefined;
  }
  const outer = readDer(bytes, 0);
  if (outer === undefined || outer.tag !== 0x30) {
    return undefined;
  }
  const first = readDer(outer.content, 0);
  if (first === undefined) {
    return undefined;
  }
  if (first.tag === 0x02) {
    return integerBits(first.content) || undefined;
  }
  if (first.tag !== 0x30) {
    return undefined;
  }
  const wrapped = readDer(outer.content, first.end);
  if (wrapped === undefined || wrapped.tag !== 0x03) {
    return undefined;
  }
  // A BIT STRING begins with the count of unused bits in its last byte.
  const inner = readDer(wrapped.content.subarray(1), 0);
  if (inner === undefined || inner.tag !== 0x30) {
    return undefined;
  }
  const modulus = readDer(inner.content, 0);
  return modulus?.tag === 0x02 ? integerBits(modulus.content) || undefined : undefined;
}

/**
 * RFC 6376 §3.6.1 — a tag-value list. The version tag is optional, but a record that carries one
 * and does not say DKIM1 is not a key record this check can read.
 */
export function parseDkimKey(text: string): DkimKey | undefined {
  const tags = new Map<string, string>();
  for (const part of text.split(";")) {
    const trimmed = part.trim();
    if (trimmed === "") {
      continue;
    }
    const at = trimmed.indexOf("=");
    if (at <= 0) {
      continue;
    }
    const name = trimmed.slice(0, at).trim().toLowerCase();
    if (!tags.has(name)) {
      tags.set(name, trimmed.slice(at + 1).trim());
    }
  }
  const version = tags.get("v");
  if (version !== undefined && version !== VERSION_VALUE) {
    return undefined;
  }
  const keyData = tags.get("p");
  if (keyData === undefined) {
    // Without a key tag there is nothing a verifier could use, so this is not a key record.
    return undefined;
  }
  const declared = tags.get("k")?.toLowerCase() ?? "rsa";
  const keyType: DkimKeyType =
    declared === "rsa" ? "rsa" : declared === "ed25519" ? "ed25519" : "other";
  const hashes = tags
    .get("h")
    ?.split(":")
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry !== "");
  const flags = (tags.get("t") ?? "").split(":").map((entry) => entry.trim().toLowerCase());
  const bits = keyType === "rsa" && keyData !== "" ? rsaKeyBits(keyData) : undefined;
  return {
    text: text.trim(),
    tags,
    keyType,
    revoked: keyData === "",
    ...(bits === undefined ? {} : { bits }),
    testMode: flags.includes("y"),
    sha1Only: hashes !== undefined && hashes.length > 0 && hashes.every((one) => one === SHA1),
  };
}

export type DkimLookupOutcome = "ANSWER" | "EMPTY" | "NAME_NOT_FOUND" | "INDETERMINATE";

export interface DkimLookupAnswer {
  readonly outcome: DkimLookupOutcome;
  readonly records?: readonly string[];
}

export type DkimLookup = (keyName: string) => Promise<DkimLookupAnswer>;

export type DkimKeyState =
  | "USABLE"
  | "REVOKED"
  | "SHORT_RSA"
  | "SHA1_ONLY"
  | "TEST_MODE"
  | "UNREADABLE"
  | "NOT_FOUND"
  | "LOOKUP_FAILED"
  | "NOTHING_TO_ASK";

export interface DkimAnalysis {
  readonly state: DkimKeyState;
  /** The names actually asked for, in the order they were asked — 1.1 §5.1. */
  readonly triedNames: readonly string[];
  /** The selector whose key is being reported, when one answered. */
  readonly selector?: string;
  readonly origin?: DkimSelectorOrigin;
  readonly key?: DkimKey;
  /** True when every selector asked for came from the user, which is what makes absence a fact. */
  readonly askedOnlyForUserSelector: boolean;
}

export interface DkimAnalysisInput {
  readonly domain: string;
  readonly selectors: readonly DkimSelector[];
  readonly lookup: DkimLookup;
}

/**
 * The first selector that answers with a readable key is the one reported. A domain publishes
 * several keys while it rotates them, and reporting each would repeat one finding under different
 * names; the order the selectors were assembled in already puts the user's own first.
 */
function stateOf(key: DkimKey): DkimKeyState {
  if (key.revoked) {
    return "REVOKED";
  }
  if (key.keyType === "rsa" && key.bits !== undefined && key.bits < DKIM_MIN_RSA_BITS) {
    return "SHORT_RSA";
  }
  if (key.sha1Only) {
    return "SHA1_ONLY";
  }
  if (key.testMode) {
    return "TEST_MODE";
  }
  return "USABLE";
}

export async function analyseDkim(input: DkimAnalysisInput): Promise<DkimAnalysis> {
  const { domain, selectors, lookup } = input;
  const askedOnlyForUserSelector =
    selectors.length > 0 && selectors.every((entry) => entry.origin === "USER");
  if (selectors.length === 0) {
    return { state: "NOTHING_TO_ASK", triedNames: [], askedOnlyForUserSelector: false };
  }

  const triedNames: string[] = [];
  let failed = false;
  let unreadable: DkimSelector | undefined;
  for (const entry of selectors) {
    const name = dkimKeyName(entry.selector, domain);
    triedNames.push(name);
    const answer = await lookup(name);
    if (answer.outcome === "INDETERMINATE") {
      failed = true;
      continue;
    }
    if (answer.outcome !== "ANSWER") {
      continue;
    }
    // RFC 6376 §3.6.2.2 joins the strings of one record; a name carrying several is unusual, so
    // each is read on its own and the first readable one answers.
    const key = (answer.records ?? [])
      .map((text) => parseDkimKey(text))
      .find((parsed): parsed is DkimKey => parsed !== undefined);
    if (key === undefined) {
      unreadable ??= entry;
      continue;
    }
    return {
      state: stateOf(key),
      triedNames,
      selector: entry.selector,
      origin: entry.origin,
      key,
      askedOnlyForUserSelector,
    };
  }

  if (unreadable !== undefined) {
    return {
      state: "UNREADABLE",
      triedNames,
      selector: unreadable.selector,
      origin: unreadable.origin,
      askedOnlyForUserSelector,
    };
  }
  if (failed) {
    return { state: "LOOKUP_FAILED", triedNames, askedOnlyForUserSelector };
  }
  return { state: "NOT_FOUND", triedNames, askedOnlyForUserSelector };
}

/** 1.1 §5 — one check: whether a key could be found and whether it is usable. */
export const DKIM_CHECK_IDS = { key: "email.dkim.key" } as const;

interface DkimCheckOptions {
  readonly domain: string;
  readonly freshness: CheckResult["freshness"];
}

function target(analysis: DkimAnalysis, domain: string): EmailPolicyTarget {
  return {
    kind: "EMAIL_POLICY",
    policy: "DKIM",
    queriedName:
      analysis.selector === undefined
        ? `${DKIM_KEY_LABEL}.${domain}`
        : dkimKeyName(analysis.selector, domain),
  };
}

function check(
  analysis: DkimAnalysis,
  status: CheckResult["status"],
  severity: Severity,
  titleCode: string,
  options: DkimCheckOptions,
  extra: Partial<CheckResult> & { readonly params?: MessageParams } = {},
): CheckResult {
  const { params, ...rest } = extra;
  return {
    checkId: DKIM_CHECK_IDS.key,
    category: "email",
    status,
    severity,
    target: target(analysis, options.domain),
    message: { titleCode, ...(params === undefined ? {} : { params }) },
    freshness: options.freshness,
    ...rest,
  };
}

/** The selectors a message quotes, rather than the full names, which belong to the Technical view. */
function askedSelectors(analysis: DkimAnalysis): string {
  return analysis.triedNames.map((name) => name.split(".")[0] ?? name).join(", ");
}

export function evaluateDkimCheck(analysis: DkimAnalysis, options: DkimCheckOptions): CheckResult {
  const selector = analysis.selector ?? "";
  const params: MessageParams = { selector };
  switch (analysis.state) {
    case "USABLE":
      return check(analysis, "PASS", "none", "email.dkim.key.present", options, { params });
    case "REVOKED":
      return check(analysis, "FAIL", "critical", "email.dkim.key.fail.revoked", options, {
        params,
      });
    case "SHORT_RSA":
      return check(analysis, "FAIL", "critical", "email.dkim.key.fail.short", options, {
        params: { selector, bits: analysis.key?.bits ?? 0, limit: DKIM_MIN_RSA_BITS },
      });
    case "SHA1_ONLY":
      return check(analysis, "FAIL", "critical", "email.dkim.key.fail.sha1", options, { params });
    case "TEST_MODE":
      return check(analysis, "FAIL", "warning", "email.dkim.key.fail.testing", options, {
        params,
      });
    case "UNREADABLE":
      return check(analysis, "FAIL", "critical", "email.dkim.key.fail.unreadable", options, {
        params,
      });
    case "NOT_FOUND":
      // 1.1 §5.5 — absence is a fact only for a name the user named; otherwise it is the end of
      // what we knew to ask for, and the message says which names those were.
      return analysis.askedOnlyForUserSelector
        ? check(analysis, "FAIL", "warning", "email.dkim.key.fail.absent", options, {
            params: { selector: askedSelectors(analysis) },
          })
        : check(analysis, "UNKNOWN", "none", "email.dkim.key.unknown.selector", options, {
            reasonCode: "dkim_selector_unknown",
            params: { selectors: askedSelectors(analysis) },
          });
    case "LOOKUP_FAILED":
      return check(analysis, "UNKNOWN", "none", "email.dkim.key.unknown.lookup", options, {
        reasonCode: "dkim_lookup_failed",
        params: { selectors: askedSelectors(analysis) },
      });
    default:
      return check(analysis, "UNKNOWN", "none", "email.dkim.key.unknown.nothing", options, {
        reasonCode: "dkim_selector_unknown",
      });
  }
}
