import { describe, expect, it } from "vitest";
import {
  assertCatalogueComplete,
  CATALOGUES,
  findCatalogueGaps,
  LANGUAGES,
  resolveMessage,
} from "../src/index.js";

describe("AC-13.6 and AC-13.7 — mandatory languages", () => {
  it("declares ru, uz and en as mandatory", () => {
    expect([...LANGUAGES]).toEqual(["ru", "uz", "en"]);
  });

  it("has a complete Russian catalogue", () => {
    const gaps = findCatalogueGaps().filter((gap) => gap.language === "ru");
    expect(gaps).toEqual([]);
  });

  it("reports Uzbek as incomplete rather than pretending it is translated", () => {
    const gap = findCatalogueGaps().find((entry) => entry.language === "uz");
    expect(gap).toBeDefined();
    expect(gap?.missing.length).toBeGreaterThan(0);
  });

  it("blocks a production configuration while a mandatory translation is missing", () => {
    expect(() => assertCatalogueComplete()).toThrow(/translations are incomplete/i);
  });
});

describe("AC-13.4 — PASS states the fact instead of a stock reassurance", () => {
  it("describes an absent AAAA record as absent", () => {
    const ru = resolveMessage(
      { titleCode: "dns.record.resolve.absent", params: { recordType: "AAAA" } },
      "ru",
    );
    expect(ru.title).toBe("Запись AAAA не обнаружена");

    const en = resolveMessage(
      { titleCode: "dns.record.resolve.absent", params: { recordType: "AAAA" } },
      "en",
    );
    expect(en.title).toBe("No AAAA record was found");
  });

  it("does not promise that everything is configured correctly", () => {
    for (const language of ["ru", "en"] as const) {
      for (const [code, entry] of Object.entries(CATALOGUES[language])) {
        if (code.endsWith(".pass")) {
          expect(entry.title.toLowerCase()).not.toMatch(
            /всё (отлично|хорошо)|everything is (fine|ok)/,
          );
        }
      }
    }
  });
});

describe("AC-13.2 — fact, then impact, then recommendation", () => {
  it("adds impact and recommendation only where a failure was confirmed", () => {
    for (const language of ["ru", "en"] as const) {
      for (const [code, entry] of Object.entries(CATALOGUES[language])) {
        if (entry.impact !== undefined || entry.recommendation !== undefined) {
          expect(code).toMatch(/\.fail$/);
        }
      }
    }
  });

  it("gives a confirmed failure both an impact and a recommendation", () => {
    const failure = resolveMessage({ titleCode: "tls.certificate.chain.fail" }, "ru");
    expect(failure.impact).toBeDefined();
    expect(failure.recommendation).toBeDefined();
  });
});

describe("AC-13.2 and AC-13.3 — wording for UNKNOWN", () => {
  it.each([
    "dns.record.resolve.unknown",
    "tls.connection.unknown",
    "registry.lookup.indeterminate",
  ])("%s says the check did not complete, without accusing the target", (code) => {
    const ru = resolveMessage(
      { titleCode: code, params: { recordType: "A", ipFamily: "IPV4" } },
      "ru",
    );
    const en = resolveMessage(
      { titleCode: code, params: { recordType: "A", ipFamily: "IPV4" } },
      "en",
    );
    expect(ru.title.toLowerCase()).toContain("не удалось");
    expect(en.title.toLowerCase()).toMatch(/could not/);
    expect(ru.title.toLowerCase()).not.toMatch(/ошибка домена|неисправн/);
  });

  it("carries no impact or recommendation, because nothing was confirmed", () => {
    const message = resolveMessage(
      { titleCode: "dns.record.resolve.unknown", params: { recordType: "MX" } },
      "ru",
    );
    expect(message.impact).toBeUndefined();
    expect(message.recommendation).toBeUndefined();
  });
});

describe("AC-13.3 — provider_not_supported is explained as a product limitation", () => {
  it("names 2check as the limit, not the domain", () => {
    const ru = resolveMessage({ titleCode: "registry.lookup.provider_not_supported" }, "ru");
    expect(ru.title).toContain("2check");
    expect(ru.explanation).toContain("ограничение сервиса");

    const en = resolveMessage({ titleCode: "registry.lookup.provider_not_supported" }, "en");
    expect(en.explanation).toContain("limitation of 2check");
  });
});

describe("AC-13.5 — no unproven causation", () => {
  it("describes a resolver disagreement as a disagreement, not as propagation", () => {
    const message = resolveMessage(
      { titleCode: "dns.record.consistency.fail", params: { recordType: "A" } },
      "ru",
    );
    expect(message.title.toLowerCase()).toContain("расход");
    expect(`${message.title} ${message.explanation ?? ""}`).not.toMatch(/распростран/i);
  });

  it("never suggests a missing name means the domain can be bought", () => {
    for (const language of ["ru", "en"] as const) {
      const joined = Object.values(CATALOGUES[language])
        .map((entry) => `${entry.title} ${entry.explanation ?? ""}`)
        .join(" ");
      expect(joined).not.toMatch(/купить|свободен|available to buy|for sale/i);
    }
  });
});

describe("AC-13.8 — parameters are plain, escaped text", () => {
  it("escapes markup in a parameter value", () => {
    const message = resolveMessage(
      { titleCode: "dns.record.resolve.present", params: { recordType: "<script>x</script>" } },
      "en",
    );
    expect(message.title).toContain("&lt;script&gt;");
    expect(message.title).not.toContain("<script>");
  });

  it("leaves an unknown placeholder untouched rather than inventing a value", () => {
    const message = resolveMessage({ titleCode: "dns.record.resolve.present" }, "en");
    expect(message.title).toContain("{recordType}");
  });
});

describe("PRD 13.6 — runtime fallback", () => {
  it("falls back to English when the requested language lacks the message", () => {
    const message = resolveMessage({ titleCode: "verdict.HEALTHY" }, "uz");
    expect(message.language).toBe("en");
    expect(message.title).toBe("No problems found");
  });

  it("returns a safe empty message for an unknown code, claiming nothing", () => {
    const message = resolveMessage({ titleCode: "nothing.like.this" }, "ru");
    expect(message.language).toBe("none");
    expect(message.title).toBe("");
    expect(message.titleCode).toBe("nothing.like.this");
  });
});
