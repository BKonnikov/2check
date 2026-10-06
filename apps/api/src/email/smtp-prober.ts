import { createConnection, type Socket } from "node:net";
import { connect as startTls, type TLSSocket } from "node:tls";
import type { StarttlsOutcome } from "@2check/domain";
import { SMTP_PORT } from "@2check/domain";
import { type PeerCertificate, toCertificate } from "../tls/certificate.js";

/**
 * 1.1 §7.2 and §13.3 — the SMTP probe.
 *
 * The session is four steps and no others: read the greeting, ask for the extensions, upgrade,
 * quit. There is no code path here that issues MAIL FROM, RCPT TO or DATA, and that is the point
 * — a probe that cannot name a sender or a recipient cannot be turned into a way of sending mail
 * or of testing whether an address exists. The port is a constant for the same reason: it is
 * never taken from input or from the domain's records, so the probe cannot be aimed.
 *
 * Nothing here resolves a name. The caller hands over an address that 1.0 §15 has already
 * validated, and the socket connects to that address with the host name used only for SNI, which
 * is what keeps the rebinding window closed — §13.2.
 */

/** The name the probe gives for itself. It is the service, said plainly, not a disguise. */
export const SMTP_EHLO_NAME = "2check.uz";

/** One budget for the whole session, which is several round trips rather than one. */
export const SMTP_PROBE_TIMEOUT_MS = 8000;

const GREETING = /^220[\s-]/;
const EXTENSIONS_OK = /^250[\s-]/;
const STARTTLS_OFFERED = /^250[\s-]+starttls\b/im;

/**
 * An SMTP reply may span several lines, with a hyphen after the code on every line but the last.
 * A reply is complete once a line carries the code followed by a space.
 */
function isComplete(buffer: string): boolean {
  const lines = buffer.split(/\r?\n/).filter((line) => line !== "");
  const last = lines.at(-1);
  return last !== undefined && /^\d{3} /.test(last);
}

interface Step {
  readonly send?: string;
  readonly accept: RegExp;
}

/** Reads one reply, then sends the next command. Resolves with the reply that came back. */
function exchange(socket: Socket, step: Step): Promise<string> {
  return new Promise((resolve, reject) => {
    let buffer = "";
    const onData = (chunk: Buffer) => {
      buffer += chunk.toString("utf8");
      if (!isComplete(buffer)) {
        return;
      }
      cleanup();
      if (!step.accept.test(buffer)) {
        reject(new Error(`unexpected reply: ${buffer.split(/\r?\n/)[0] ?? ""}`));
        return;
      }
      resolve(buffer);
    };
    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };
    const onClose = () => {
      cleanup();
      reject(new Error("closed before a complete reply"));
    };
    function cleanup() {
      socket.off("data", onData);
      socket.off("error", onError);
      socket.off("close", onClose);
    }
    socket.on("data", onData);
    socket.once("error", onError);
    socket.once("close", onClose);
    if (step.send !== undefined) {
      socket.write(step.send);
    }
  });
}

interface Upgraded {
  readonly secure: TLSSocket;
  readonly protocol: string;
  readonly peer: PeerCertificate;
  readonly authorized: boolean;
  readonly authorizationError?: string;
}

function upgrade(socket: Socket, hostname: string, timeoutMs: number): Promise<Upgraded> {
  return new Promise((resolve, reject) => {
    // Certificate validation is not delegated to the socket: an invalid certificate still has to
    // be describable, so trust is reported through chainVerification rather than by refusing.
    const secure = startTls(
      {
        socket,
        servername: hostname,
        rejectUnauthorized: false,
        minVersion: "TLSv1.2",
      },
      () => {
        const peer = secure.getPeerCertificate(true) as PeerCertificate;
        if (peer.valid_to === undefined) {
          reject(new Error("no certificate was presented"));
          return;
        }
        resolve({
          secure,
          protocol: secure.getProtocol() ?? "unknown",
          peer,
          authorized: secure.authorized,
          ...(secure.authorizationError === undefined
            ? {}
            : { authorizationError: secure.authorizationError.toString() }),
        });
      },
    );
    secure.setTimeout(timeoutMs, () => reject(new Error("the upgrade did not complete in time")));
    secure.once("error", reject);
  });
}

/**
 * 1.1 §7.4 and §7.6 — the outcome of one host, and whose fault it was.
 *
 * The distinction the section turns on is whether the server said anything. A connection that
 * never came up, or a session that broke before the extension list, is not a server without
 * encryption: nothing was observed, and the result is UNKNOWN. A server that answered and listed
 * no STARTTLS is a confirmed fact about that server.
 */
export async function runSession(
  live: Socket,
  endpoint: { readonly hostname: string; readonly address: string },
  timeoutMs = SMTP_PROBE_TIMEOUT_MS,
): Promise<StarttlsOutcome> {
  const { hostname, address } = endpoint;
  const observedAt = () => new Date().toISOString();
  try {
    await exchange(live, { accept: GREETING });
    const extensions = await exchange(live, {
      send: `EHLO ${SMTP_EHLO_NAME}\r\n`,
      accept: EXTENSIONS_OK,
    });
    if (!STARTTLS_OFFERED.test(extensions)) {
      // §7.2 — the session is ended rather than dropped. `end` flushes the command and sends the
      // FIN, which a plain destroy would not: the server would see an abandoned connection.
      live.end("QUIT\r\n");
      return { kind: "NOT_OFFERED", hostname, address, observedAt: observedAt() };
    }
    await exchange(live, { send: "STARTTLS\r\n", accept: GREETING });
    try {
      const secured = await upgrade(live, hostname, timeoutMs);
      secured.secure.end("QUIT\r\n");
      return {
        kind: "SECURED",
        hostname,
        address,
        protocol: secured.protocol,
        certificate: toCertificate(secured.peer, secured.authorized, secured.authorizationError),
        observedAt: observedAt(),
      };
    } catch (error) {
      // The server offered encryption and then could not provide it, which §7.4 counts as a
      // confirmed failure of the server rather than as an observation we failed to make.
      return {
        kind: "UPGRADE_FAILED",
        hostname,
        address,
        failureCode: error instanceof Error ? error.message : "upgrade_failed",
        observedAt: observedAt(),
      };
    }
  } catch {
    return { kind: "SESSION_INCOMPLETE", hostname, address };
  } finally {
    // Whatever happened, the socket does not outlive the probe; a session that ended politely
    // has already queued its QUIT, and destroying it here would throw that away.
    if (!live.writableEnded) {
      live.destroy();
    }
  }
}

/**
 * The one entry point the orchestrator uses, and the only place a port is named.
 *
 * The session above takes a socket that is already open, which is what lets it be exercised
 * against a fake server without a port ever becoming an argument. Here the port is the constant
 * and nothing else: there is no parameter, no option and no fallback that could change it —
 * AC-13.4.
 */
export async function probeMailHost(
  address: string,
  hostname: string,
  timeoutMs = SMTP_PROBE_TIMEOUT_MS,
): Promise<StarttlsOutcome> {
  let socket: Socket;
  try {
    socket = await new Promise<Socket>((resolve, reject) => {
      const pending = createConnection({ host: address, port: SMTP_PORT });
      pending.setTimeout(timeoutMs, () => {
        pending.destroy();
        reject(new Error("the connection did not come up in time"));
      });
      pending.once("connect", () => {
        pending.setTimeout(timeoutMs);
        resolve(pending);
      });
      pending.once("error", reject);
    });
  } catch {
    return { kind: "CONNECT_FAILED", hostname, address };
  }
  return runSession(socket, { hostname, address }, timeoutMs);
}
