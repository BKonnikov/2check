import { describe, expect, it } from "vitest";
import {
  assertCatalogueComplete,
  CATALOGUES,
  findCatalogueGaps,
  LANGUAGES,
  resolveMessage,
  unreviewedLanguages,
} from "../src/index.js";

describe("AC-13.6 and AC-13.7 — mandatory languages", () => {
  it("declares ru, uz and en as mandatory", () => {
    expect([...LANGUAGES]).toEqual(["ru", "uz", "en"]);
  });

  it("has a complete Russian catalogue", () => {
    const gaps = findCatalogueGaps().filter((gap) => gap.language === "ru");
    expect(gaps).toEqual([]);
  });

  it("has a complete Uzbek catalogue", () => {
    const gaps = findCatalogueGaps().filter((gap) => gap.language === "uz");
    expect(gaps).toEqual([]);
  });

  it("does not block a production configuration once every language is present", () => {
    expect(() => assertCatalogueComplete()).not.toThrow();
  });

  it("still records that the Uzbek wording has not been read by a native speaker", () => {
    expect(unreviewedLanguages()).toEqual(["uz"]);
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
    for (const language of LANGUAGES) {
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
  it("adds impact and recommendation to a check only where a failure was confirmed", () => {
    for (const language of LANGUAGES) {
      for (const [code, entry] of Object.entries(CATALOGUES[language])) {
        if (code.startsWith("web.error.")) {
          continue;
        }
        if (entry.impact !== undefined || entry.recommendation !== undefined) {
          // A confirmed failure may be qualified further — tls.connection.fail.timeout.
          expect(code).toMatch(/\.fail(\.|$)/);
        }
      }
    }
  });

  /**
   * An input rejection is a confirmed fact about the input, so it may say what to do instead.
   * It still claims nothing about the domain, so it never carries an impact.
   */
  it("lets an input rejection say what to do, but never claim an impact", () => {
    for (const language of LANGUAGES) {
      for (const [code, entry] of Object.entries(CATALOGUES[language])) {
        if (code.startsWith("web.error.")) {
          expect(entry.impact).toBeUndefined();
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
    for (const language of LANGUAGES) {
      const joined = Object.values(CATALOGUES[language])
        .map((entry) => `${entry.title} ${entry.explanation ?? ""}`)
        .join(" ");
      expect(joined).not.toMatch(/купить|свободен|available to buy|for sale|sotib olish|bo'sh/i);
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
    // Every mandatory language is complete now, so the fallback is exercised through a code that
    // only the reference catalogue defines.
    (CATALOGUES.en as Record<string, { title: string }>)["test.fallback.only"] = {
      title: "Reference wording",
    };
    const message = resolveMessage({ titleCode: "test.fallback.only" }, "uz");
    expect(message.language).toBe("en");
    expect(message.title).toBe("Reference wording");
    delete (CATALOGUES.en as Record<string, unknown>)["test.fallback.only"];
  });

  it("returns a safe empty message for an unknown code, claiming nothing", () => {
    const message = resolveMessage({ titleCode: "nothing.like.this" }, "ru");
    expect(message.language).toBe("none");
    expect(message.title).toBe("");
    expect(message.titleCode).toBe("nothing.like.this");
  });
});

describe("PRD 13.6 — the Uzbek catalogue", () => {
  it("is written in Latin script, as used officially in Uzbekistan", () => {
    const joined = Object.values(CATALOGUES.uz)
      .map((entry) => entry.title)
      .join(" ");
    expect(joined).not.toMatch(/[\u0400-\u04FF]/);
  });

  it("says a check could not be completed without accusing the target", () => {
    const message = resolveMessage(
      { titleCode: "dns.record.resolve.unknown", params: { recordType: "A" } },
      "uz",
    );
    expect(message.language).toBe("uz");
    expect(message.title.toLowerCase()).toContain("bo'lmadi");
  });

  it("explains provider_not_supported as a limit of the service", () => {
    const message = resolveMessage({ titleCode: "registry.lookup.provider_not_supported" }, "uz");
    expect(message.title).toContain("2check");
    expect(message.explanation).toContain("cheklovi");
  });
});
