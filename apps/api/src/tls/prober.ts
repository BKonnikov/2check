import { connect } from "node:tls";
import type { TlsCertificate, TlsIpFamily } from "@2check/contracts";
import type { TlsProbeOutcome } from "@2check/domain";

export const TLS_PORT = 443;

/** PRD 10.8 — failures of the target, as distinct from failures of our own scanner. */
/**
 * PRD 10.8 and AC-10.8 — a connection result is a FAIL of the target only when the target itself
 * was observed. These are the codes where something on the other end actually answered:
 * a refusal is the target's own stack saying no, a reset or a broken pipe is a connection that
 * existed and was torn down, and §18.4 rules that a TCP or handshake timeout against a validated
 * target counts as a FAIL rather than an absence of evidence.
 *
 * EHOSTUNREACH and ENETUNREACH are deliberately NOT here, though they look like they belong.
 * They mean this machine has no path to the address — no route, or an intermediate router saying
 * so. Nothing was observed about the target at all, which is exactly the case §10.8 sends to
 * UNKNOWN/internal_network_error. Calling it a FAIL would publish a defect of our own network as
 * a defect of somebody's domain.
 */
const TARGET_FAILURE_CODES = new Set(["ECONNREFUSED", "ECONNRESET", "ETIMEDOUT", "EPIPE"]);

/**
 * PRD 10.8 — whose failure it was. Separated from the socket so the rule can be tested directly
 * rather than inferred from whichever errors a machine happens to be able to produce.
 */
export function classifyProbeError(
  code: string,
):
  | { readonly kind: "TARGET_FAILURE"; readonly failureCode: string }
  | { readonly kind: "SCANNER_FAILURE"; readonly reasonCode: "internal_network_error" } {
  if (TARGET_FAILURE_CODES.has(code) || code.startsWith("ERR_SSL") || code.startsWith("ERR_TLS")) {
    return { kind: "TARGET_FAILURE", failureCode: code || "handshake_failed" };
  }
  return { kind: "SCANNER_FAILURE", reasonCode: "internal_network_error" };
}

interface PeerCertificate {
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

function toCertificate(
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

/**
 * PRD 10.3 — connects straight to the validated, pinned IP with the hostname in SNI.
 * `host` is an address literal, so the TLS client performs no name resolution of its own
 * (AC-10.2) and the rebinding window stays closed. No HTTP request is ever made.
 *
 * Certificate validation is not delegated to the socket: rejectUnauthorized stays false so an
 * invalid certificate can still be described, and trust is reported through chainVerification.
 */
export function probeEndpoint(
  address: string,
  hostname: string,
  _family: TlsIpFamily,
  timeoutMs = 8000,
): Promise<TlsProbeOutcome> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (outcome: TlsProbeOutcome): void => {
      if (!settled) {
        settled = true;
        socket.destroy();
        resolve(outcome);
      }
    };

    const socket = connect({
      host: address,
      port: TLS_PORT,
      servername: hostname,
      rejectUnauthorized: false,
      minVersion: "TLSv1.2",
      timeout: timeoutMs,
    });

    socket.once("secureConnect", () => {
      const peer = socket.getPeerCertificate(true) as PeerCertificate;
      if (peer.valid_to === undefined) {
        finish({ kind: "SCANNER_FAILURE", address, reasonCode: "scanner_tls_error" });
        return;
      }
      finish({
        kind: "CONNECTED",
        address,
        protocol: socket.getProtocol() ?? "unknown",
        certificate: toCertificate(peer, socket.authorized, socket.authorizationError?.toString()),
      });
    });

    socket.once("timeout", () =>
      finish({ kind: "TARGET_FAILURE", address, failureCode: "connection_timeout" }),
    );

    socket.once("error", (error: NodeJS.ErrnoException) => {
      finish({ ...classifyProbeError(error.code ?? ""), address });
    });
  });
}
