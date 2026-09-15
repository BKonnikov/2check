import { connect } from "node:tls";
import type { TlsCertificate, TlsIpFamily } from "@2check/contracts";
import type { TlsProbeOutcome } from "@2check/domain";

export const TLS_PORT = 443;

/** PRD 10.8 — failures of the target, as distinct from failures of our own scanner. */
const TARGET_FAILURE_CODES = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "ETIMEDOUT",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "EPIPE",
]);

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

function describe(name: { CN?: string; O?: string } | undefined): string {
  return name?.CN ?? name?.O ?? "";
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
      const code = error.code ?? "";
      if (
        TARGET_FAILURE_CODES.has(code) ||
        code.startsWith("ERR_SSL") ||
        code.startsWith("ERR_TLS")
      ) {
        finish({ kind: "TARGET_FAILURE", address, failureCode: code || "handshake_failed" });
        return;
      }
      // AC-10.8 — nothing trustworthy was observed about the target.
      finish({ kind: "SCANNER_FAILURE", address, reasonCode: "internal_network_error" });
    });
  });
}
