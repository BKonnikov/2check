import { describe, expect, it } from "vitest";
import {
  analyseMailServer,
  evaluateMailServerCheck,
  type HostObservation,
  isAddressLiteral,
  isNullMx,
  type MailServerInput,
  type MxObservation,
  mailServerSubject,
} from "../src/mail-host.js";

const FRESHNESS = { checkedAt: "2026-10-02T00:00:00.000Z", cached: false, cacheAge: 0 } as const;

function host(hostname: string, addresses: readonly string[], alias = false): HostObservation {
  return {
    hostname,
    outcome: addresses.length > 0 ? "ANSWER" : "EMPTY",
    addresses,
    ...(alias ? { alias: true } : {}),
  };
}

function analyse(overrides: Partial<MailServerInput> = {}) {
  const input: MailServerInput = {
    domain: "example.uz",
    mx: { outcome: "EMPTY" },
    domainAddresses: { outcome: "EMPTY", addresses: [] },
    hosts: [],
    ...overrides,
  };
  return analyseMailServer(input);
}

function mx(...records: readonly { preference: number; exchange: string }[]): MxObservation {
  return { outcome: "ANSWER", records };
}

function evaluate(overrides: Partial<MailServerInput> = {}) {
  const analysis = analyse(overrides);
  const result = evaluateMailServerCheck(analysis, { domain: "example.uz", freshness: FRESHNESS });
  return { analysis, result, verdict: `${result.status}/${result.severity}` };
}

describe("AC-6.1 — locating the receiving server", () => {
  it("takes the hosts from the MX records, in order of preference", () => {
    const { analysis } = evaluate({
      mx: mx({ preference: 20, exchange: "backup.uz" }, { preference: 10, exchange: "mail.uz" }),
      hosts: [host("mail.uz", ["203.0.113.1"]), host("backup.uz", ["203.0.113.2"])],
    });
    expect(analysis.hosts.map((entry) => entry.hostname)).toEqual(["mail.uz", "backup.uz"]);
    expect(analysis.hosts[0]?.preference).toBe(10);
  });

  it("falls back to the domain's own addresses when there is no MX", () => {
    const { analysis, verdict } = evaluate({
      domainAddresses: { outcome: "ANSWER", addresses: ["203.0.113.9"] },
    });
    expect(analysis.state).toBe("IMPLICIT");
    expect(analysis.hosts[0]).toEqual({
      hostname: "example.uz",
      implicit: true,
      addresses: ["203.0.113.9"],
    });
    // The mail arrives, but at a host chosen by a different question.
    expect(verdict).toBe("FAIL/warning");
  });

  it("marks the implicit host on the target so a reader can see where it came from", () => {
    const { result } = evaluate({
      domainAddresses: { outcome: "ANSWER", addresses: ["203.0.113.9"] },
    });
    expect(result.target).toMatchObject({ kind: "MAIL_HOST", implicit: true });
  });
});

describe("AC-6.2 — a declared refusal of mail", () => {
  it("recognises the record RFC 7505 defines", () => {
    expect(isNullMx([{ preference: 0, exchange: "." }])).toBe(true);
    expect(isNullMx([{ preference: 0, exchange: "" }])).toBe(true);
    expect(isNullMx([{ preference: 10, exchange: "." }])).toBe(false);
    // A domain publishing a null MX must publish no other, so two records are never one.
    expect(
      isNullMx([
        { preference: 0, exchange: "." },
        { preference: 10, exchange: "a.uz" },
      ]),
    ).toBe(false);
  });

  it("passes a domain that takes no mail and says so", () => {
    const { verdict, analysis } = evaluate({ mx: mx({ preference: 0, exchange: "." }) });
    expect(verdict).toBe("PASS/none");
    expect(mailServerSubject(analysis)).toBe("NULL_MX");
  });
});

describe("AC-6.4, AC-6.5 — no server, and no usable host", () => {
  it("reports a domain with neither records as a warning, not a critical failure", () => {
    const { verdict, analysis } = evaluate();
    expect(verdict).toBe("FAIL/warning");
    expect(mailServerSubject(analysis)).toBe("MISSING");
  });

  it("reports MX records whose every host is unusable as critical", () => {
    const { verdict } = evaluate({
      mx: mx({ preference: 10, exchange: "mail.uz" }),
      hosts: [host("mail.uz", [])],
    });
    expect(verdict).toBe("FAIL/critical");
  });

  it("leaves the dependent checks with a subject whenever one host works", () => {
    const { analysis } = evaluate({
      mx: mx({ preference: 10, exchange: "mail.uz" }, { preference: 20, exchange: "dead.uz" }),
      hosts: [host("mail.uz", ["203.0.113.1"]), host("dead.uz", [])],
    });
    expect(mailServerSubject(analysis)).toBe("PRESENT");
    expect(analysis.hosts).toHaveLength(1);
  });
});

describe("AC-6.6 — whether a host is usable", () => {
  it("treats an address written in place of a name as critical", () => {
    expect(isAddressLiteral("203.0.113.1")).toBe(true);
    expect(isAddressLiteral("2001:db8::1")).toBe(true);
    expect(isAddressLiteral("mail.example.uz")).toBe(false);
    // A name that merely looks numeric is still a name.
    expect(isAddressLiteral("203.0.113.999")).toBe(false);
    const { verdict } = evaluate({
      mx: mx({ preference: 10, exchange: "203.0.113.1" }, { preference: 20, exchange: "mail.uz" }),
      hosts: [host("mail.uz", ["203.0.113.2"])],
    });
    expect(verdict).toBe("FAIL/critical");
  });

  it("treats an alias host as a warning, because most senders still deliver to it", () => {
    const { verdict } = evaluate({
      mx: mx({ preference: 10, exchange: "mail.uz" }),
      hosts: [host("mail.uz", ["203.0.113.1"], true)],
    });
    expect(verdict).toBe("FAIL/warning");
  });

  it("names the hosts that dropped out when delivery continues through the rest", () => {
    const { result, verdict } = evaluate({
      mx: mx({ preference: 10, exchange: "mail.uz" }, { preference: 20, exchange: "dead.uz" }),
      hosts: [host("mail.uz", ["203.0.113.1"]), host("dead.uz", [])],
    });
    expect(verdict).toBe("FAIL/warning");
    expect(result.message.params).toEqual({ hosts: "dead.uz" });
  });
});

describe("AC-6.7 — an unfinished lookup", () => {
  it("does not become a conclusion that no records exist", () => {
    const { result } = evaluate({ mx: { outcome: "INDETERMINATE" } });
    expect(result.status).toBe("UNKNOWN");
    expect(result.reasonCode).toBe("mx_lookup_failed");
  });

  it("distinguishes a host that would not resolve from a host with no addresses", () => {
    const { result, analysis } = evaluate({
      mx: mx({ preference: 10, exchange: "mail.uz" }),
      hosts: [{ hostname: "mail.uz", outcome: "INDETERMINATE" }],
    });
    expect(result.status).toBe("UNKNOWN");
    expect(result.reasonCode).toBe("mx_host_resolution_failed");
    expect(analysis.state).toBe("INDETERMINATE");
  });

  it("does not fall back to the address records when the MX lookup itself failed", () => {
    // Otherwise a transport failure would be reported as a domain with no MX records.
    const { analysis } = evaluate({
      mx: { outcome: "INDETERMINATE" },
      domainAddresses: { outcome: "ANSWER", addresses: ["203.0.113.9"] },
    });
    expect(analysis.state).toBe("INDETERMINATE");
  });
});
