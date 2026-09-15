import type {
  CanonicalDomain,
  InputRejectionCode,
  InputType,
  PublicSuffixType,
} from "@2check/contracts";
import { ParseResultType, parseDomain } from "parse-domain";
import tr46 from "tr46";

export type CanonicalizationResult =
  | { readonly ok: true; readonly domain: CanonicalDomain }
  | { readonly ok: false; readonly code: InputRejectionCode };

/**
 * PRD 5.2 — UTS #46 Nontransitional with IDNA validation and the standard DNS length limits.
 * STD3 rules are what reject underscore owner names such as _dmarc.example.uz (PRD 5.1).
 */
const IDNA_OPTIONS = {
  checkHyphens: true,
  checkBidi: true,
  checkJoiners: true,
  useSTD3ASCIIRules: true,
  verifyDNSLength: true,
  transitionalProcessing: false,
} as const;

// A scheme is only recognized with an authority, or when what follows the colon is not a port:
// otherwise "example.uz:8443" would read as the scheme "example.uz".
const SCHEME_WITH_AUTHORITY = /^([a-z][a-z0-9+.-]*):\/\//i;
const SCHEME_WITHOUT_AUTHORITY = /^([a-z][a-z0-9+.-]*):(?!\d+(?:[/?#]|$))/i;
const IPV4 = /^\d{1,3}(?:\.\d{1,3}){3}$/;

function reject(code: InputRejectionCode): CanonicalizationResult {
  return { ok: false, code };
}

/** PRD 5.1 — only a hostname, an HTTP(S) URL, or a scheme-less URL-like string is accepted. */
function classifyInput(raw: string): { type: InputType; code?: InputRejectionCode } {
  const withAuthority = SCHEME_WITH_AUTHORITY.exec(raw);
  if (withAuthority) {
    const protocol = (withAuthority[1] ?? "").toLowerCase();
    if (protocol !== "http" && protocol !== "https") {
      return { type: "URL", code: "input_scheme_unsupported" };
    }
    return { type: "URL" };
  }
  if (SCHEME_WITHOUT_AUTHORITY.test(raw)) {
    return { type: "HOSTNAME", code: "input_scheme_unsupported" };
  }
  if (raw.includes("@") && !raw.includes("/")) {
    return { type: "HOSTNAME", code: "input_email_address" };
  }
  if (raw.startsWith("//") || raw.includes("/") || raw.includes("@") || raw.includes(":")) {
    return { type: "URL_LIKE" };
  }
  return { type: "HOSTNAME" };
}

/**
 * PRD 5.1–5.4 — preprocessing shared by every module. No module normalizes input on its own.
 * Typo correction is deliberately absent (PRD 5.5).
 */
export function canonicalizeDomain(input: string): CanonicalizationResult {
  const originalInput = input.trim();
  if (originalInput.length === 0) {
    return reject("input_empty");
  }

  const classified = classifyInput(originalInput);
  if (classified.code) {
    return reject(classified.code);
  }
  const inputType = classified.type;

  // A wildcard never survives URL parsing, so it is caught first to keep the reason precise.
  if (originalInput.includes("*")) {
    return reject("input_wildcard_hostname");
  }

  let url: URL;
  try {
    url = new URL(
      inputType === "URL" ? originalInput : `https://${originalInput.replace(/^\/\//, "")}`,
    );
  } catch {
    return reject("input_hostname_invalid");
  }

  if (url.username !== "" || url.password !== "") {
    return reject("input_credentials_present");
  }
  // A default port is normalized away by URL, so anything left is a non-standard port.
  if (url.port !== "") {
    return reject("input_port_not_allowed");
  }

  let host = url.hostname;
  if (host.startsWith("[")) {
    return reject("input_ip_address");
  }

  const hadTrailingDot = host.endsWith(".");
  if (hadTrailingDot) {
    host = host.slice(0, -1);
  }
  if (IPV4.test(host)) {
    return reject("input_ip_address");
  }

  const asciiHostname = tr46.toASCII(host, IDNA_OPTIONS);
  if (asciiHostname === null || asciiHostname.length === 0) {
    return reject("input_hostname_invalid");
  }

  const labels = asciiHostname.split(".");
  if (labels.length < 2) {
    return reject("input_single_label");
  }

  const unicode = tr46.toUnicode(asciiHostname);
  const unicodeHostname = unicode.error ? asciiHostname : unicode.domain;

  const parsed = parseDomain(asciiHostname);
  if (parsed.type === ParseResultType.Ip) {
    return reject("input_ip_address");
  }
  if (parsed.type === ParseResultType.Reserved) {
    return reject("input_reserved_hostname");
  }
  if (parsed.type === ParseResultType.Invalid) {
    return reject("input_hostname_invalid");
  }

  let publicSuffix: string | null = null;
  let publicSuffixType: PublicSuffixType = "UNKNOWN";
  let registrableDomain: string | null = null;

  if (parsed.type === ParseResultType.Listed) {
    const suffix = parsed.topLevelDomains.join(".");
    const icannSuffix = parsed.icann.topLevelDomains.join(".");
    publicSuffix = suffix;
    // PRD 5.5 / AC-5.5 — a suffix the ICANN section does not produce came from the private section.
    publicSuffixType = suffix === icannSuffix ? "ICANN" : "PRIVATE";
    registrableDomain = parsed.domain === undefined ? null : `${parsed.domain}.${suffix}`;
  }
  // NOT_LISTED keeps UNKNOWN with no suffix and no registrable domain: the boundary is not known,
  // and guessing one would hand every module a value the PSL never asserted.

  return {
    ok: true,
    domain: {
      originalInput,
      inputType,
      unicodeHostname,
      asciiHostname,
      publicSuffix,
      publicSuffixType,
      registrableDomain,
      labels,
      isIdn: labels.some((label) => label.startsWith("xn--")),
      hadTrailingDot,
    },
  };
}
