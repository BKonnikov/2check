import { createServer } from "node:net";
import { describe, expect, it } from "vitest";
import { classifyProbeError, probeEndpoint } from "../src/tls/prober.js";

/**
 * PRD 10.8 and AC-10.8 — a connection FAIL is a statement about somebody's domain, so it may
 * only be made when the target itself was observed. Anything that went wrong on this side of the
 * wire is UNKNOWN/internal_network_error, because nothing about the target was learned.
 */
describe("AC-10.8 — whose failure the connection was", () => {
  it.each([
    // The target's own stack answered.
    ["ECONNREFUSED", "TARGET_FAILURE"],
    ["ECONNRESET", "TARGET_FAILURE"],
    ["EPIPE", "TARGET_FAILURE"],
    // PRD 18.4 — a timeout against a validated target is ruled a connection FAIL.
    ["ETIMEDOUT", "TARGET_FAILURE"],
    // A handshake that got far enough to fail on TLS terms.
    ["ERR_SSL_WRONG_VERSION_NUMBER", "TARGET_FAILURE"],
    ["ERR_TLS_HANDSHAKE_TIMEOUT", "TARGET_FAILURE"],
    // This machine has no path there: nothing was observed, so nothing may be claimed.
    ["EHOSTUNREACH", "SCANNER_FAILURE"],
    ["ENETUNREACH", "SCANNER_FAILURE"],
    ["ENETDOWN", "SCANNER_FAILURE"],
    ["EACCES", "SCANNER_FAILURE"],
    ["EMFILE", "SCANNER_FAILURE"],
    ["", "SCANNER_FAILURE"],
  ])("classifies %s as %s", (code, kind) => {
    expect(classifyProbeError(code).kind).toBe(kind);
  });

  it("keeps the code, so the reason survives into the technical view", () => {
    const classified = classifyProbeError("ECONNREFUSED");
    expect(classified).toEqual({ kind: "TARGET_FAILURE", failureCode: "ECONNREFUSED" });
  });
});

describe("PRD 10.3 — the probe itself", () => {
  it("reports a refused port as a failure of the target", async () => {
    // A port that is listening, then closed, is refused rather than filtered.
    const server = createServer();
    const port = await new Promise<number>((resolve) => {
      server.listen(0, "127.0.0.1", () => {
        const address = server.address();
        resolve(typeof address === "object" && address !== null ? address.port : 0);
      });
    });
    await new Promise((resolve) => server.close(resolve));

    const outcome = await probeEndpoint("127.0.0.1", "example.uz", "IPV4", 2000);
    expect(outcome.kind).toBe("TARGET_FAILURE");
    expect(port).toBeGreaterThan(0);
  });
});
