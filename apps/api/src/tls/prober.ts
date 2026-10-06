import { connect } from "node:tls";
import type { TlsIpFamily } from "@2check/contracts";
import type { TlsProbeOutcome } from "@2check/domain";
import { type PeerCertificate, toCertificate } from "./certificate.js";

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
