import { readFileSync } from "node:fs";
import { createConnection, createServer, type Server } from "node:net";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  probeMailHost,
  runSession,
  SMTP_EHLO_NAME,
  SMTP_PROBE_TIMEOUT_MS,
} from "../src/email/smtp-prober.js";

/** The module's code, with its comments removed: a guard about code should not read prose. */
const SOURCE = readFileSync(
  fileURLToPath(new URL("../src/email/smtp-prober.ts", import.meta.url)),
  "utf8",
)
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^\s*\/\/.*$/gm, "");

/**
 * AC-7.2 and AC-13.6 — the probe issues no sender, recipient or data command, ever.
 *
 * This is checked against the source because that is where the guarantee lives. There is no
 * input that makes the prober send MAIL FROM, and the way to keep that true as the file changes
 * is to assert that no such command exists in it at all, rather than to try the inputs that
 * happen to exist today and conclude from their absence.
 */
describe("AC-7.2 and AC-13.6 — the probe cannot send mail", () => {
  /**
   * Everything the module could put on the wire. A command sent to a server ends with CRLF, so
   * the literals carrying one are exactly the wire data, and the rest of the module's strings —
   * event names, error text — are not.
   */
  const wire = [...SOURCE.matchAll(/[`"]([^`"\n]*\\r\\n)[`"]/g)].map((match) =>
    (match[1] ?? "").replace(/\\r\\n/g, "").trim(),
  );

  it("puts nothing on the wire but the three commands the session is allowed", () => {
    expect(wire.length).toBeGreaterThan(0);
    for (const line of wire) {
      expect(line, line).toMatch(/^(EHLO |QUIT$|STARTTLS$)/);
    }
  });

  it("names no sender, recipient or data command anywhere in the module", () => {
    // Upper case, because that is how a client writes a command and how this module would.
    for (const command of ["MAIL", "RCPT", "DATA", "BDAT", "VRFY", "EXPN", "AUTH"]) {
      expect(SOURCE, command).not.toContain(command);
    }
  });

  it("names a fixed port rather than reading one from anywhere", () => {
    // §13.3 — the port is not settable from input or from the domain's records.
    expect(SOURCE).toContain("port: SMTP_PORT");
    expect(SOURCE).not.toMatch(/port:\s*(?!SMTP_PORT)[a-z]/);
  });

  it("gives the service's own name in the greeting, rather than a disguise", () => {
    expect(SMTP_EHLO_NAME).toBe("2check.uz");
  });
});

/**
 * The session itself, against a server that behaves in each of the ways §7.4 and §7.6 describe.
 *
 * The session takes a socket that is already open, so a fake server can be reached on a loopback
 * port the test chose without a port ever becoming an argument of the probe. The real entry point
 * keeps the port as a constant, which the guards above assert.
 */
describe("1.1 §7.4 — the probe reads the extension list", () => {
  interface Fake {
    readonly port: number;
    readonly seen: string[];
    /** Resolves once the probe's connection is gone, so an assertion never races the wire. */
    readonly done: Promise<void>;
    close(): void;
  }

  function server(script: readonly string[]): Promise<Fake> {
    const seen: string[] = [];
    let finished: () => void = () => {};
    const done = new Promise<void>((resolve) => {
      finished = resolve;
    });
    return new Promise((resolve) => {
      const instance: Server = createServer((socket) => {
        let step = 0;
        socket.write(script[0] ?? "");
        socket.on("data", (chunk) => {
          seen.push(chunk.toString("utf8").trim());
          step += 1;
          const reply = script[step];
          if (reply === undefined) {
            socket.end();
            return;
          }
          socket.write(reply);
        });
        socket.once("close", finished);
      });
      instance.listen(0, "127.0.0.1", () => {
        const address = instance.address();
        resolve({
          port: typeof address === "object" && address !== null ? address.port : 0,
          seen,
          done,
          close: () => instance.close(),
        });
      });
    });
  }

  function session(port: number) {
    return new Promise<ReturnType<typeof runSession>>((resolve) => {
      const socket = createConnection({ host: "127.0.0.1", port }, () => {
        socket.setTimeout(2000);
        resolve(runSession(socket, { hostname: "mx.test", address: "127.0.0.1" }, 2000));
      });
    }).then((pending) => pending);
  }

  it("asks for the extensions and then quits when encryption is not offered", async () => {
    const fake = await server(["220 mx.test ESMTP\r\n", "250-mx.test\r\n250 PIPELINING\r\n"]);
    const outcome = await session(fake.port);
    await fake.done;
    fake.close();
    expect(outcome.kind).toBe("NOT_OFFERED");
    expect(fake.seen[0]).toBe(`EHLO ${SMTP_EHLO_NAME}`);
    // §7.2 — the session is ended with QUIT rather than abandoned.
    expect(fake.seen.at(-1)).toBe("QUIT");
    expect(fake.seen.join(" ")).not.toMatch(/MAIL|RCPT|DATA/i);
  });

  it("reads a multi-line extension list before deciding", async () => {
    const fake = await server([
      "220 mx.test ESMTP\r\n",
      "250-mx.test\r\n250-PIPELINING\r\n250-SIZE 35882577\r\n250 STARTTLS\r\n",
      "220 go ahead\r\n",
    ]);
    const outcome = await session(fake.port);
    fake.close();
    // The server offered encryption and then could not provide it, which §7.4 calls a failure
    // of the server rather than an observation we failed to make.
    expect(outcome.kind).toBe("UPGRADE_FAILED");
    expect(fake.seen).toContain("STARTTLS");
  });

  it("reports a session that ended before the extension list as incomplete", async () => {
    const fake = await server(["220 mx.test ESMTP\r\n"]);
    const outcome = await session(fake.port);
    fake.close();
    expect(outcome.kind).toBe("SESSION_INCOMPLETE");
  });

  it("reports a greeting that refuses the session as incomplete, not as plain text", async () => {
    const fake = await server(["554 no service here\r\n"]);
    const outcome = await session(fake.port);
    fake.close();
    expect(outcome.kind).toBe("SESSION_INCOMPLETE");
  });

  it("reports a connection that never came up", async () => {
    // Nothing listens on loopback port 1, so the connection is refused at once.
    const outcome = await probeMailHost("127.0.0.1", "mx.test", 2000);
    expect(outcome.kind).toBe("CONNECT_FAILED");
  });

  it("keeps one budget for the whole session, which is several round trips", () => {
    expect(SMTP_PROBE_TIMEOUT_MS).toBeGreaterThanOrEqual(5000);
  });
});
