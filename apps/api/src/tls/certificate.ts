import type { TlsCertificate } from "@2check/contracts";

/**
 * PRD 10.5 — reading a peer certificate as the product describes it.
 *
 * Shared between the TLS prober and the SMTP one: 1.1 §7.5 says a mail host's certificate is
 * parsed by the rules of 1.0 §10, and the way to keep that true is for both to parse it with the
 * same code rather than with two readings of the same paragraph.
 */

export interface PeerCertificate {
  subject?: { CN?: string };
  issuer?: { CN?: string; O?: string };
  valid_from?: string;
  valid_to?: string;
  subjectaltname?: string;
  fingerprint256?: string;
  issuerCertificate?: PeerCertificate;
  raw?: Buffer;
}

/**
 * PRD 10.5 — validity, hostname and chain are three separate findings, so the chain verdict must
 * not absorb the other two. Node reports a single verification failure for the certificate, and
 * a hostname mismatch or a date outside the validity window sets it exactly as a broken chain
 * does. Those two are judged on their own from the certificate's fields, so seeing them here
 * means the chain was never reached — which is NOT_VERIFIED, not UNTRUSTED.
 */
const STOPPED_BEFORE_THE_CHAIN = new Set([
  "ERR_TLS_CERT_ALTNAME_INVALID",
  "CERT_HAS_EXPIRED",
  "CERT_NOT_YET_VALID",
]);

function verifyChain(
  authorized: boolean,
  authorizationError: string | undefined,
): "TRUSTED" | "UNTRUSTED" | "NOT_VERIFIED" {
  if (authorized) {
    return "TRUSTED";
  }
  if (authorizationError === undefined) {
    return "NOT_VERIFIED";
  }
  return STOPPED_BEFORE_THE_CHAIN.has(authorizationError) ? "NOT_VERIFIED" : "UNTRUSTED";
}

/**
 * A distinguished name as a person would recognise it. An issuer's common name is often an
 * internal label — "YR2", "R11" — which answers "who issued this?" with nothing at all, so the
 * organisation is named alongside it whenever the certificate carries one.
 */
function describe(name: { CN?: string; O?: string } | undefined): string {
  const common = name?.CN ?? "";
  const organisation = name?.O ?? "";
  if (common === "" || organisation === "" || common === organisation) {
    return common === "" ? organisation : common;
  }
  return `${common} (${organisation})`;
}

export function toCertificate(
  peer: PeerCertificate,
  authorized: boolean,
  authorizationError: string | undefined,
): TlsCertificate {
  const subjectAltNames = (peer.subjectaltname ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry !== "");

  // A leaf whose issuer certificate is itself is self-signed.
  const selfSigned =
    peer.issuerCertificate !== undefined &&
    peer.raw !== undefined &&
    peer.issuerCertificate.raw !== undefined &&
    peer.raw.equals(peer.issuerCertificate.raw);

  return {
    subject: describe(peer.subject),
    issuer: describe(peer.issuer),
    validFrom: new Date(peer.valid_from ?? 0).toISOString(),
    validTo: new Date(peer.valid_to ?? 0).toISOString(),
    subjectAltNames,
    fingerprint256: peer.fingerprint256 ?? "",
    selfSigned,
    chainVerification: verifyChain(authorized, authorizationError),
    ...(authorizationError === undefined ? {} : { chainErrorCode: authorizationError }),
  };
}
