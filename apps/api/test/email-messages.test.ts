import type { TlsCertificate } from "@2check/contracts";
import {
  analyseDkim,
  analyseDmarc,
  analyseMailServer,
  analysePtr,
  analyseSpf,
  analyseStarttls,
  type DkimLookupAnswer,
  type DkimSelector,
  type DmarcLookupAnswer,
  evaluateDkimCheck,
  evaluateDmarcChecks,
  evaluateMailServerCheck,
  evaluatePtrChecks,
  evaluateSpfChecks,
  evaluateStarttlsChecks,
  type HostObservation,
  type MailServerInput,
  type MailServerState,
  SPF_CHECK_IDS,
  type SpfLookupAnswer,
  type StarttlsOutcome,
} from "@2check/domain";
import { CATALOGUES, LANGUAGES, resolveMessage } from "@2check/messages";
import { describe, expect, it } from "vitest";

/**
 * 1.1 §11 — every outcome the mail modules can produce has to be sayable in all three languages.
 * The domain module and the catalogue live in different packages and are tested separately, so
 * this is the only place a code that nobody wrote a message for would be caught.
 */
const FRESHNESS = { checkedAt: "2026-10-02T00:00:00.000Z", cached: false, cacheAge: 0 } as const;

async function outcome(
  answer: SpfLookupAnswer,
  zone: Readonly<Record<string, SpfLookupAnswer>> = {},
) {
  const analysis = await analyseSpf({
    domain: "example.uz",
    answer,
    lookup: async (name) => zone[name] ?? { outcome: "NAME_NOT_FOUND" },
  });
  return evaluateSpfChecks(analysis, { domain: "example.uz", freshness: FRESHNESS });
}

function answer(...records: string[]): SpfLookupAnswer {
  return { outcome: "ANSWER", records };
}

async function dmarcOutcome(
  own: DmarcLookupAnswer,
  zone: Readonly<Record<string, DmarcLookupAnswer>> = {},
  domainExists?: boolean,
) {
  const analysis = await analyseDmarc({
    domain: "example.uz",
    answer: own,
    lookup: async (name) => zone[name] ?? { outcome: "NAME_NOT_FOUND" },
    ...(domainExists === undefined ? {} : { domainExists }),
  });
  return evaluateDmarcChecks(analysis, { domain: "example.uz", freshness: FRESHNESS });
}

async function dkimOutcome(
  selectors: readonly DkimSelector[],
  zone: Readonly<Record<string, DkimLookupAnswer>> = {},
) {
  const analysis = await analyseDkim({
    domain: "example.uz",
    selectors,
    lookup: async (name) => zone[name] ?? { outcome: "NAME_NOT_FOUND" },
  });
  return [evaluateDkimCheck(analysis, { domain: "example.uz", freshness: FRESHNESS })];
}

/** A real 2048-bit key, and a real 512-bit one, so the short-key branch is a real short key. */
const RSA_2048 =
  "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAmG1javSGSFFzqR4KGGKsiNnMipYtbWR7RA7MDLeLbJeLYw4n1UhYqRPvoM3yMgHSRh01T5JSkzJVqyCPbxcKXfJcVppbmfzxPah7hBGUcF85j5A+kI4S2rruj1u3aFMd8iLgYA26qO2LlkXi3CpJ0MFXDU00LKJkpBjV5BL6a1pepgRa3LgJiu4vqqAQL3Hn37+safjVJhOvkKScDRPWf95X61mrkcAoxTdw7C2JCtFcXko0zEQAppaFv16bcL4pXoacOWCwBnS5lrWt/nPwxvf52DP3S346S9ZM4Ky3H2LeYV0hw+YHzGVctt4tCL/wyU4SBLBl62qPNKQI01TGywIDAQAB";
const RSA_512 =
  "MFwwDQYJKoZIhvcNAQEBBQADSwAwSAJBAMAurHsw1IP24kALgZYw8qdO9laQwG26bn9S4OFFpwO48lbPNAb74ZIMm0iX1Px3uxjfcf88+t13kCVqvjP21jcCAwEAAQ==";

const KEY = "mine._domainkey.example.uz";
const MINE: readonly DkimSelector[] = [{ selector: "mine", origin: "USER" }];
const FROM_SERVICE: readonly DkimSelector[] = [{ selector: "google", origin: "SERVICE" }];

function mailOutcome(overrides: Partial<MailServerInput>) {
  const analysis = analyseMailServer({
    domain: "example.uz",
    mx: { outcome: "EMPTY" },
    domainAddresses: { outcome: "EMPTY", addresses: [] },
    hosts: [],
    ...overrides,
  });
  return [evaluateMailServerCheck(analysis, { domain: "example.uz", freshness: FRESHNESS })];
}

function host(hostname: string, addresses: readonly string[], alias = false): HostObservation {
  return {
    hostname,
    outcome: addresses.length > 0 ? "ANSWER" : "EMPTY",
    addresses,
    ...(alias ? { alias: true } : {}),
  };
}

function cert(overrides: Partial<TlsCertificate> = {}): TlsCertificate {
  return {
    subject: "mail.uz",
    issuer: "R11 (Let's Encrypt)",
    validFrom: "2026-01-01T00:00:00.000Z",
    validTo: "2099-01-01T00:00:00.000Z",
    subjectAltNames: ["DNS:mail.uz"],
    fingerprint256: "ab:cd",
    selfSigned: false,
    chainVerification: "TRUSTED",
    ...overrides,
  };
}

function tlsOn(hostname: string, certificate = cert()): StarttlsOutcome {
  return {
    kind: "SECURED",
    hostname,
    address: "93.184.216.34",
    protocol: "TLSv1.3",
    certificate,
    observedAt: FRESHNESS.checkedAt,
  };
}

function tlsOff(hostname: string): StarttlsOutcome {
  return {
    kind: "NOT_OFFERED",
    hostname,
    address: "93.184.216.35",
    observedAt: FRESHNESS.checkedAt,
  };
}

function starttlsOutcome(
  probes: readonly StarttlsOutcome[],
  skipped: readonly string[] = [],
  receivingServer?: MailServerState,
) {
  const analysis = analyseStarttls({ domain: "example.uz", probes, skipped });
  return evaluateStarttlsChecks(analysis, {
    domain: "example.uz",
    freshness: FRESHNESS,
    ...(receivingServer === undefined ? {} : { receivingServer }),
  });
}

function ptrOutcome(
  reverse: readonly {
    address: string;
    hostname: string;
    outcome: "ANSWER" | "EMPTY" | "INDETERMINATE";
    names?: readonly string[];
  }[],
  forward: readonly {
    name: string;
    outcome: "ANSWER" | "EMPTY" | "INDETERMINATE";
    addresses?: readonly string[];
    alias?: boolean;
  }[] = [],
  receivingServer?: MailServerState,
) {
  return evaluatePtrChecks(analysePtr({ reverse, forward }), {
    domain: "example.uz",
    freshness: FRESHNESS,
    ...(receivingServer === undefined ? {} : { receivingServer }),
  });
}

/** One of every branch the modules can take. */
async function everyOutcome() {
  const loop = {
    "loop.uz": answer("v=spf1 include:example.uz -all"),
    "example.uz": answer("v=spf1 include:loop.uz -all"),
  };
  const results = await Promise.all([
    outcome(answer("v=spf1 -all")),
    outcome(answer("v=spf1 ~all")),
    outcome(answer("v=spf1 ?all")),
    outcome(answer("v=spf1 +all")),
    outcome(answer("v=spf1 ip4:203.0.113.1")),
    outcome(answer("v=spf1 ptr -all")),
    outcome(answer("v=spf1 a a a a a a a a a a a -all")),
    outcome(answer("v=spf1 include:a.uz include:b.uz include:c.uz -all")),
    outcome(answer("v=spf1 include:loop.uz -all"), loop),
    outcome(answer("v=spf1 include:%{i}.block.uz -all")),
    outcome(answer("v=spf1 redirect=gone.uz")),
    outcome(answer("v=spf1 -all", "v=spf1 ip4:203.0.113.0/24 -all")),
    outcome(answer("v=spf1 frobnicate -all")),
    outcome({ outcome: "EMPTY" }),
    outcome({ outcome: "INDETERMINATE" }),
  ]);
  const mail = [
    mailOutcome({
      mx: { outcome: "ANSWER", records: [{ preference: 10, exchange: "mail.uz" }] },
      hosts: [host("mail.uz", ["203.0.113.1"])],
    }),
    mailOutcome({
      mx: { outcome: "ANSWER", records: [{ preference: 10, exchange: "aspmx.l.google.com" }] },
      hosts: [host("aspmx.l.google.com", ["203.0.113.1"])],
    }),
    mailOutcome({
      mx: {
        outcome: "ANSWER",
        records: [{ preference: 10, exchange: "route1.mx.cloudflare.net" }],
      },
      hosts: [host("route1.mx.cloudflare.net", ["203.0.113.1"])],
    }),
    mailOutcome({ mx: { outcome: "ANSWER", records: [{ preference: 0, exchange: "." }] } }),
    mailOutcome({ domainAddresses: { outcome: "ANSWER", addresses: ["203.0.113.9"] } }),
    mailOutcome({}),
    mailOutcome({
      mx: { outcome: "ANSWER", records: [{ preference: 10, exchange: "mail.uz" }] },
      hosts: [host("mail.uz", [])],
    }),
    mailOutcome({
      mx: { outcome: "ANSWER", records: [{ preference: 10, exchange: "203.0.113.1" }] },
      hosts: [],
    }),
    mailOutcome({
      mx: {
        outcome: "ANSWER",
        records: [
          { preference: 10, exchange: "alias.uz" },
          { preference: 20, exchange: "dead.uz" },
        ],
      },
      hosts: [host("alias.uz", ["203.0.113.1"], true), host("dead.uz", [])],
    }),
    mailOutcome({ mx: { outcome: "INDETERMINATE" } }),
    mailOutcome({
      mx: {
        outcome: "ANSWER",
        records: [
          { preference: 10, exchange: "mail.uz" },
          { preference: 20, exchange: "203.0.113.9" },
        ],
      },
      hosts: [host("mail.uz", ["203.0.113.1"])],
    }),
    mailOutcome({
      mx: {
        outcome: "ANSWER",
        records: [
          { preference: 10, exchange: "mail.uz" },
          { preference: 20, exchange: "dead.uz" },
        ],
      },
      hosts: [host("mail.uz", ["203.0.113.1"]), host("dead.uz", [])],
    }),
  ];
  const dmarc = await Promise.all([
    dmarcOutcome(answer("v=DMARC1; p=reject; rua=mailto:d@example.uz")),
    dmarcOutcome(answer("v=DMARC1; p=quarantine; pct=50")),
    dmarcOutcome(answer("v=DMARC1; p=reject; rua=https://reports.example.net/dmarc")),
    dmarcOutcome(answer("v=DMARC1; p=none")),
    dmarcOutcome(answer("v=DMARC1; rua=")),
    dmarcOutcome(answer("v=DMARC1; p=reject", "v=DMARC1; p=none")),
    dmarcOutcome(answer("v=dmarc1; p=reject")),
    dmarcOutcome({ outcome: "EMPTY" }),
    dmarcOutcome({ outcome: "INDETERMINATE" }),
    dmarcOutcome({ outcome: "EMPTY" }, { "_dmarc.uz": { outcome: "INDETERMINATE" } }),
    dmarcOutcome({ outcome: "EMPTY" }, { "_dmarc.uz": answer("v=DMARC1; p=reject; sp=reject") }),
    dmarcOutcome(
      { outcome: "EMPTY" },
      { "_dmarc.uz": answer("v=DMARC1; p=reject; sp=quarantine; psd=y") },
      true,
    ),
  ]);
  const dkim = await Promise.all([
    dkimOutcome(MINE, { [KEY]: answer(`v=DKIM1; k=rsa; p=${RSA_2048}`) }),
    dkimOutcome(MINE, { [KEY]: answer("v=DKIM1; p=") }),
    dkimOutcome(MINE, { [KEY]: answer(`v=DKIM1; p=${RSA_512}`) }),
    dkimOutcome(MINE, { [KEY]: answer(`v=DKIM1; h=sha1; p=${RSA_2048}`) }),
    dkimOutcome(MINE, { [KEY]: answer(`v=DKIM1; t=y; p=${RSA_2048}`) }),
    dkimOutcome(MINE, { [KEY]: answer("v=DKIM2; p=abc") }),
    dkimOutcome(MINE),
    dkimOutcome(FROM_SERVICE),
    dkimOutcome([]),
    dkimOutcome(MINE, { [KEY]: { outcome: "INDETERMINATE" } }),
  ]);
  const starttls = [
    starttlsOutcome([tlsOn("mail.uz")]),
    starttlsOutcome([tlsOn("mail.uz")], ["spare.uz"]),
    starttlsOutcome([tlsOn("mail.uz"), tlsOff("plain.uz")]),
    starttlsOutcome([tlsOff("plain.uz")]),
    starttlsOutcome([
      {
        kind: "UPGRADE_FAILED",
        hostname: "mail.uz",
        address: "93.184.216.34",
        failureCode: "handshake_failed",
        observedAt: FRESHNESS.checkedAt,
      },
    ]),
    starttlsOutcome([{ kind: "UNAVAILABLE", hostname: "mail.uz" }]),
    starttlsOutcome([
      { kind: "BLOCKED", hostname: "mail.uz", reasonCode: "own_infrastructure_not_observed" },
    ]),
    starttlsOutcome([{ kind: "BLOCKED", hostname: "mail.uz", reasonCode: "ssrf_policy_block" }]),
    starttlsOutcome([{ kind: "CONNECT_FAILED", hostname: "mail.uz" }]),
    starttlsOutcome([{ kind: "SESSION_INCOMPLETE", hostname: "mail.uz" }]),
    starttlsOutcome([]),
    starttlsOutcome([], [], "NULL_MX"),
    starttlsOutcome([], [], "MISSING"),
    starttlsOutcome([tlsOn("mail.uz", cert({ validTo: "2026-01-02T00:00:00.000Z" }))]),
    starttlsOutcome([tlsOn("mail.uz", cert({ validFrom: "2099-01-01T00:00:00.000Z" }))]),
    starttlsOutcome([tlsOn("mail.uz", cert({ subjectAltNames: ["DNS:other.net"] }))]),
    starttlsOutcome([tlsOn("mail.uz", cert({ chainVerification: "UNTRUSTED" }))]),
    starttlsOutcome([tlsOn("mail.uz", cert({ chainVerification: "NOT_VERIFIED" }))]),
  ];
  const named = (names: readonly string[]) => [
    { address: "203.0.113.5", hostname: "mail.uz", outcome: "ANSWER" as const, names },
  ];
  const ptr = [
    ptrOutcome(named(["mail.uz"]), [
      { name: "mail.uz", outcome: "ANSWER", addresses: ["203.0.113.5"] },
    ]),
    ptrOutcome(named(["elsewhere.uz"]), [
      { name: "elsewhere.uz", outcome: "ANSWER", addresses: ["198.51.100.9"] },
    ]),
    ptrOutcome(named(["alias.uz"]), [
      { name: "alias.uz", outcome: "ANSWER", addresses: ["203.0.113.5"], alias: true },
    ]),
    ptrOutcome([
      { address: "203.0.113.5", hostname: "mail.uz", outcome: "EMPTY" },
      { address: "2001:db8::1", hostname: "mail.uz", outcome: "EMPTY" },
    ]),
    ptrOutcome(named(["mail.uz"]), [{ name: "mail.uz", outcome: "INDETERMINATE" }]),
    ptrOutcome([{ address: "203.0.113.5", hostname: "mail.uz", outcome: "INDETERMINATE" }]),
    ptrOutcome([]),
    ptrOutcome([], [], "NULL_MX"),
    ptrOutcome([], [], "MISSING"),
  ];
  return [...results, ...mail, ...dmarc, ...dkim, ...starttls, ...ptr].flat();
}

describe("the mail messages", () => {
  it("covers every outcome the module produces, in every mandatory language", async () => {
    const codes = new Set((await everyOutcome()).map((check) => check.message.titleCode));
    expect(codes.size).toBeGreaterThan(10);
    for (const language of LANGUAGES) {
      for (const code of codes) {
        const resolved = resolveMessage({ titleCode: code }, language);
        expect(resolved.title, `${code} in ${language}`).not.toBe("");
      }
    }
  });

  it("leaves no wording in the catalogue that no outcome can reach", async () => {
    // The other direction of the same guard: a code nobody produces is wording nobody reads.
    const produced = new Set((await everyOutcome()).map((check) => check.message.titleCode));
    const written = Object.keys(CATALOGUES.ru).filter((code) => code.startsWith("email."));
    expect(written.filter((code) => !produced.has(code))).toEqual([]);
  });

  it("leaves no placeholder unfilled in a rendered title or fact", async () => {
    for (const check of await everyOutcome()) {
      for (const language of LANGUAGES) {
        const resolved = resolveMessage(check.message, language);
        expect(`${resolved.title} ${resolved.fact ?? ""}`, check.message.titleCode).not.toMatch(
          /\{[a-zA-Z]+\}/,
        );
      }
    }
  });

  it("gives an impact and a recommendation only where a failure was confirmed", async () => {
    for (const check of await everyOutcome()) {
      const resolved = resolveMessage(check.message, "ru");
      if (resolved.impact !== undefined || resolved.recommendation !== undefined) {
        expect(check.status, check.message.titleCode).toBe("FAIL");
      }
    }
  });

  it("says nothing about the fate of a message", async () => {
    // 1.1 §11.2 — the forbidden claims all share one shape, and spam is where it shows up.
    const forbidden = /спам|spam|не дойд|не доставл|not be delivered|will land/i;
    for (const check of await everyOutcome()) {
      for (const language of LANGUAGES) {
        const resolved = resolveMessage(check.message, language);
        const text = [
          resolved.title,
          resolved.fact,
          resolved.explanation,
          resolved.impact,
          resolved.recommendation,
        ]
          .filter((part): part is string => part !== undefined)
          .join(" ");
        expect(text, check.message.titleCode).not.toMatch(forbidden);
      }
    }
  });

  it("blocks the dependent checks on the record check rather than on a reason of their own", async () => {
    const checks = await outcome({ outcome: "EMPTY" });
    const blocked = checks.filter((check) => check.status === "NOT_APPLICABLE");
    expect(blocked).toHaveLength(3);
    for (const check of blocked) {
      expect(check.blockedBy).toBe(SPF_CHECK_IDS.record);
    }
  });
});
