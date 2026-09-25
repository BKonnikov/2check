import { describe, expect, it } from "vitest";
import { CHROME } from "../app/_components/chrome";
import { withTextChunks } from "../app/_components/pngMetadata";
import { buildShareCardModel } from "../app/_components/shareCard";

const UI = CHROME.ru.ui;

function scan(overrides: Record<string, unknown> = {}) {
  return {
    scanId: "3f2a6d1e-0000-4000-8000-1234567890ab",
    mode: "FULL",
    canonicalDomain: { unicodeHostname: "почта.uz", asciiHostname: "xn--80a1acny.uz" },
    completedAt: "2026-09-15T12:30:00.000Z",
    categories: [
      {
        category: "dns",
        status: "FAIL",
        checks: [
          { status: "PASS", freshness: { checkedAt: "2026-09-15T12:29:00.000Z" } },
          { status: "PASS", freshness: { checkedAt: "2026-09-15T12:29:00.000Z" } },
          { status: "FAIL", freshness: { checkedAt: "2026-09-15T12:29:00.000Z" } },
        ],
      },
      { category: "registry", status: "UNKNOWN", checks: [{ status: "UNKNOWN" }] },
      {
        category: "tls",
        status: "PASS",
        checks: [{ status: "PASS" }, { status: "NOT_APPLICABLE" }],
      },
    ],
    summary: {
      state: "FINAL",
      verdictCode: "RECOMMENDATIONS",
      score: 78,
      confidence: { level: "REDUCED" },
      issues: [
        {
          severity: "critical",
          message: { titleCode: "tls.certificate.hostname.fail" },
        },
        {
          severity: "warning",
          message: { titleCode: "dns.record.consistency.fail", params: { recordType: "MX" } },
        },
      ],
    },
    ...overrides,
  } as Parameters<typeof buildShareCardModel>[0];
}

/**
 * PRD 23.9 — the card carries the safe public representation and nothing else. These are the
 * rules that keep it that way, checked on the model rather than on pixels.
 */
describe("AC-23.8 — the share card carries nothing it should not", () => {
  it("names the domain and no identifier, URL or input", () => {
    const model = buildShareCardModel(scan(), "ru", UI);
    const serialised = JSON.stringify(model);
    expect(model.domain).toBe("почта.uz");
    expect(serialised).not.toContain("3f2a6d1e");
    expect(serialised).not.toMatch(/https?:\/\//);
    expect(serialised).not.toContain("scanId");
    // AC-24.7 — the string the reader typed never reaches a representation of the result.
    expect(serialised).not.toContain("originalInput");
  });

  it("carries no technical detail", () => {
    const model = buildShareCardModel(scan(), "ru", UI);
    const serialised = JSON.stringify(model);
    for (const technical of ["93.184", "fingerprint", "TLSv1", "registrar", "nameServers"]) {
      expect(serialised).not.toContain(technical);
    }
  });

  it("says nothing about a partial check when the scan was full", () => {
    expect(buildShareCardModel(scan(), "ru", UI).partialLabel).toBeUndefined();
  });

  it("shows at most two issues, however many there are", () => {
    const many = scan({
      summary: {
        state: "FINAL",
        verdictCode: "PROBLEMS",
        score: 10,
        confidence: { level: "HIGH" },
        issues: Array.from({ length: 7 }, () => ({
          severity: "warning",
          message: { titleCode: "dns.record.consistency.fail", params: { recordType: "MX" } },
        })),
      },
    });
    expect(buildShareCardModel(many, "ru", UI).issues).toHaveLength(2);
  });
});

describe("AC-23.3 — a PARTIAL card states nothing about the whole domain", () => {
  it("has no verdict and no score", () => {
    const partial = scan({
      mode: "PARTIAL",
      categories: [{ category: "tls", status: "PASS" }],
      summary: {
        state: "FINAL",
        confidence: { level: "HIGH" },
        issues: [],
      },
    });
    const model = buildShareCardModel(partial, "ru", UI);
    expect(model.verdict).toBeUndefined();
    expect(model.score).toBeUndefined();
    expect(model.tone).toBe("neutral");
    // Something has to stand where the verdict would be, or the card looks like it lost it.
    expect(model.partialLabel).toBe(UI.sharePartial);
    // What it did check is still named.
    expect(model.categories.map((category) => category.name)).toEqual(["SSL/TLS"]);
  });
});

describe("PRD 13.6 — the card speaks the language of the page", () => {
  it.each(["ru", "uz", "en"] as const)("resolves every label in %s", (language) => {
    const model = buildShareCardModel(scan(), language, CHROME[language].ui);
    expect(model.verdict).toBeDefined();
    expect(model.confidence).not.toBe("");
    for (const category of model.categories) {
      expect(category.name).not.toMatch(/^category\./);
      expect(category.status).not.toMatch(/^[A-Z_]+$/);
    }
    for (const issue of model.issues) {
      expect(issue.title).not.toMatch(/\.fail$/);
      expect(issue.title).not.toMatch(/\{\w+\}/);
    }
  });
});

/**
 * A card that only says "fine" asks the reader to take it on faith. It has to say what was
 * looked at, and when.
 */
describe("the card says what was checked, not only that it was", () => {
  it("reports how much of each category passed", () => {
    const model = buildShareCardModel(scan(), "ru", UI);
    expect(
      model.categories.map((category) => [category.name, category.passed, category.total]),
    ).toEqual([
      ["DNS", 2, 3],
      ["Домен", 0, 1],
      // A check that does not apply counts in neither column.
      ["SSL/TLS", 1, 1],
    ]);
  });

  it("colours each category by its own outcome, not by the overall verdict", () => {
    const model = buildShareCardModel(scan(), "ru", UI);
    expect(model.categories.map((category) => category.tone)).toEqual(["fail", "warn", "pass"]);
  });

  it("carries the moment the checks were made", () => {
    const model = buildShareCardModel(scan(), "ru", UI);
    expect(model.checkedAt).toContain("Проверено");
    expect(model.checkedAt).toMatch(/\d/);
  });

  it("has no moment to show when the scan never recorded one", () => {
    const withoutTime = scan({ completedAt: undefined, categories: [] });
    expect(buildShareCardModel(withoutTime, "ru", UI).checkedAt).toBeUndefined();
  });
});

/**
 * The complaint the listing answers: "SSL/TLS — 4/4 проверок пройдено" scores the test rather
 * than describing the domain. A reader wants to know what was found, not that somebody was
 * satisfied.
 */
describe("a narrow scan says what it found, not how many boxes it ticked", () => {
  function tlsOnly(checks: readonly Record<string, unknown>[]) {
    return scan({
      mode: "PARTIAL",
      categories: [{ category: "tls", status: "PASS", checks }],
      summary: { state: "FINAL", confidence: { level: "HIGH" }, issues: [] },
    });
  }

  it("names each check, with the measurement the message carries", () => {
    const model = buildShareCardModel(
      tlsOnly([
        {
          status: "PASS",
          message: {
            titleCode: "tls.connection.pass",
            params: { ipFamily: "IPv4", protocol: "TLSv1.3" },
          },
        },
        {
          status: "PASS",
          message: { titleCode: "tls.certificate.validity.pass", params: { daysRemaining: 178 } },
        },
      ]),
      "ru",
      UI,
    );
    expect(model.checks?.map((check) => check.title)).toEqual([
      "Соединение по IPv4 установлено, протокол TLSv1.3",
      "Сертификат действует ещё 178 дн.",
    ]);
    expect(model.moreChecks).toBeUndefined();
  });

  it("puts the findings above the reassurances", () => {
    const model = buildShareCardModel(
      tlsOnly([
        { status: "NOT_APPLICABLE", message: { titleCode: "tls.certificate.validity.blocked" } },
        { status: "PASS", message: { titleCode: "tls.certificate.hostname.pass" } },
        { status: "FAIL", message: { titleCode: "tls.certificate.chain.fail" } },
        { status: "UNKNOWN", message: { titleCode: "tls.certificate.chain.unknown" } },
      ]),
      "ru",
      UI,
    );
    expect(model.checks?.map((check) => check.tone)).toEqual(["fail", "warn", "pass", "neutral"]);
  });

  it("counts the checks it had no room for instead of dropping them silently", () => {
    const model = buildShareCardModel(
      tlsOnly(
        Array.from({ length: 9 }, () => ({
          status: "PASS",
          message: { titleCode: "tls.certificate.hostname.pass" },
        })),
      ),
      "ru",
      UI,
    );
    expect(model.checks).toHaveLength(6);
    expect(model.moreChecks).toBe("и ещё 3");
  });

  it("leaves a full scan to its categories, which are its summary", () => {
    expect(buildShareCardModel(scan(), "ru", UI).checks).toBeUndefined();
  });
});

/**
 * A card of one check was a domain name, a status word and a tally of one. What the reader came
 * for — when the registration was made and how long it is paid for — is in the message, and the
 * card can carry it.
 */
describe("a check's particulars travel with it", () => {
  const registryOnly = scan({
    mode: "PARTIAL",
    categories: [
      {
        category: "registry",
        status: "PASS",
        checks: [
          {
            status: "PASS",
            message: {
              titleCode: "registry.lookup.registered.record",
              params: {
                registrar: "OOO BILLUR COM",
                createdAt: "2024-06-20T00:00:00.000Z",
                expiresAt: "2027-06-20T00:00:00.000Z",
              },
            },
          },
        ],
      },
    ],
    summary: { state: "FINAL", confidence: { level: "HIGH" }, issues: [] },
  });

  it("carries the registration dates under the finding", () => {
    const model = buildShareCardModel(registryOnly, "ru", UI);
    expect(model.checks?.[0]?.title).toContain("BILLUR COM");
    expect(model.checks?.[0]?.fact).toContain("20 июня 2024");
    expect(model.checks?.[0]?.fact).toContain("20 июня 2027");
  });

  it("leaves a check with no particulars without one", () => {
    const model = buildShareCardModel(
      scan({
        mode: "PARTIAL",
        categories: [
          {
            category: "tls",
            status: "PASS",
            checks: [{ status: "PASS", message: { titleCode: "tls.certificate.chain.pass" } }],
          },
        ],
        summary: { state: "FINAL", confidence: { level: "HIGH" }, issues: [] },
      }),
      "ru",
      UI,
    );
    expect(model.checks?.[0]?.fact).toBeUndefined();
  });
});

/**
 * PRD 23.9 — the name is the only part of a shared picture most people ever read: it is what the
 * share sheet shows and what somebody searches for a month later. It used to be built as a
 * prefix, which read "2check-2check.uz.png" for this service's own domain.
 */
describe("what the picture is called", () => {
  it("names the domain, then the service, then the day the checks ran", () => {
    const model = buildShareCardModel(scan(), "ru", UI);
    expect(model.file.name).toBe("почта.uz — 2check.uz — 2026-09-15.png");
  });

  it("leaves the day out rather than inventing one when the scan carries no moment", () => {
    const model = buildShareCardModel(
      scan({ completedAt: undefined, categories: [{ category: "dns", status: "PASS" }] }),
      "ru",
      UI,
    );
    expect(model.file.name).toBe("почта.uz — 2check.uz.png");
  });

  it("cannot be talked into building a path", () => {
    const model = buildShareCardModel(
      scan({ canonicalDomain: { unicodeHostname: "../../etc/passwd" } }),
      "ru",
      UI,
    );
    expect(model.file.name).not.toContain("/");
    expect(model.file.name.startsWith("....etcpasswd")).toBe(true);
  });

  it("titles the picture in the language it was drawn in", () => {
    expect(buildShareCardModel(scan(), "ru", CHROME.ru.ui).file.title).toBe(
      "почта.uz — проверка домена",
    );
    expect(buildShareCardModel(scan(), "en", CHROME.en.ui).file.title).toBe(
      "почта.uz — domain check",
    );
  });

  it("dates the picture the way the PNG specification asks", () => {
    // RFC 1123, which is what "Creation Time" is defined to hold.
    expect(buildShareCardModel(scan(), "ru", UI).file.createdAt).toBe(
      "Tue, 15 Sep 2026 12:30:00 GMT",
    );
  });
});

/**
 * The chunks are written by hand, so the invariants a reader depends on — the signature, the
 * header first, a correct checksum — are asserted rather than assumed.
 */
describe("what the picture says about itself inside", () => {
  const SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

  function chunkOf(type: string, data: number[]): number[] {
    const body = [...type].map((character) => character.charCodeAt(0)).concat(data);
    const length = [
      (data.length >>> 24) & 0xff,
      (data.length >>> 16) & 0xff,
      (data.length >>> 8) & 0xff,
      data.length & 0xff,
    ];
    return [...length, ...body, 0, 0, 0, 0];
  }

  /** A PNG with nothing in it but the two chunks the format requires. */
  function bare(): Uint8Array<ArrayBuffer> {
    return new Uint8Array([
      ...SIGNATURE,
      ...chunkOf("IHDR", [0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0]),
      ...chunkOf("IEND", []),
    ]);
  }

  function chunkTypes(png: Uint8Array): string[] {
    const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
    const types: string[] = [];
    let at = 8;
    while (at + 12 <= png.length) {
      types.push(String.fromCharCode(...png.subarray(at + 4, at + 8)));
      at += 12 + view.getUint32(at);
    }
    return types;
  }

  it("puts the text after the header and before everything else", () => {
    const out = withTextChunks(bare(), [{ keyword: "Software", value: "2check.uz" }]);
    expect(chunkTypes(out)).toEqual(["IHDR", "tEXt", "IEND"]);
  });

  it("uses iTXt for text Latin-1 cannot spell", () => {
    const out = withTextChunks(bare(), [{ keyword: "Title", value: "почта.uz — проверка домена" }]);
    expect(chunkTypes(out)).toEqual(["IHDR", "iTXt", "IEND"]);
    expect(new TextDecoder().decode(out)).toContain("почта.uz — проверка домена");
  });

  it("checksums every chunk it writes", () => {
    const out = withTextChunks(bare(), [{ keyword: "Software", value: "2check.uz" }]);
    const view = new DataView(out.buffer, out.byteOffset, out.byteLength);
    const length = view.getUint32(33);
    const stated = view.getUint32(33 + 8 + length);
    expect(stated).toBe(crc32Of(out.subarray(33 + 4, 33 + 8 + length)));
  });

  it("returns what it was given rather than damaging something it cannot read", () => {
    const notAPng: Uint8Array<ArrayBuffer> = new Uint8Array([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
    ]);
    expect(withTextChunks(notAPng, [{ keyword: "Title", value: "x" }])).toBe(notAPng);
    const png = bare();
    expect(withTextChunks(png, [{ keyword: "Title", value: "" }])).toBe(png);
  });
});

/** An independent implementation, so the test is not the code under test written twice. */
function crc32Of(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 1) !== 0 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}
