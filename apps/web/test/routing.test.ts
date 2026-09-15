import { describe, expect, it } from "vitest";
import {
  alternates,
  CHROME,
  INDEXABLE_PATHS,
  LOCALES,
  localeAlternates,
  negotiateLocale,
} from "../app/_components/chrome";
import robots from "../app/robots";
import sitemap from "../app/sitemap";

describe("AC-24.3 — the sitemap lists only indexable pages", () => {
  const entries = sitemap();

  it("covers every locale and every product page", () => {
    expect(entries).toHaveLength(LOCALES.length * INDEXABLE_PATHS.length);
  });

  it("contains no scan route, API route or gated resource", () => {
    for (const entry of entries) {
      expect(entry.url).not.toContain("/scan/");
      expect(entry.url).not.toContain("/api/");
      expect(entry.url).not.toContain("registrant");
    }
  });

  it("offers no history catalogue keyed by domain", () => {
    for (const entry of entries) {
      expect(entry.url).not.toMatch(/\/domain\//);
    }
  });
});

describe("PRD 24.4 — robots.txt is not the boundary, only a hint", () => {
  it("keeps crawlers away from scan and API routes", () => {
    const rules = robots().rules;
    const disallow = Array.isArray(rules) ? rules[0]?.disallow : rules.disallow;
    expect(disallow).toContain("/api/");
    for (const locale of LOCALES) {
      expect(disallow).toContain(`/${locale}/scan/`);
    }
  });
});

describe("AC-24.4 — SEO copy stays inside the product boundary", () => {
  it("never promises geographically distributed DNS checking", () => {
    for (const locale of LOCALES) {
      const dns = CHROME[locale].toolBody.dns.join(" ");
      expect(dns).not.toMatch(
        /из разных стран.{0,40}выполняется|geographically distributed checking is part/i,
      );
      // The copy names the limit explicitly instead.
      expect(dns).toMatch(/не входит|not part of this version|bu versiyaga kirmaydi/i);
    }
  });

  it("never promises every TLD for registration", () => {
    for (const locale of LOCALES) {
      const whois = CHROME[locale].toolBody.whois.join(" ");
      expect(whois).not.toMatch(/все (зоны|домены)|all TLDs|any TLD/i);
      expect(whois).toMatch(/\.uz/);
    }
  });

  it("never promises cipher grading, HSTS, OCSP or HTTP checks", () => {
    for (const locale of LOCALES) {
      const ssl = CHROME[locale].toolBody.ssl.join(" ");
      expect(ssl).toMatch(/не входят|not part of this version|bu versiyaga kirmaydi/i);
      expect(ssl).not.toMatch(/оцениваем шифры|cipher grade is|HSTS check is included/i);
    }
  });
});

describe("AC-24.7 and PRD 24.3 — metadata carries no target data", () => {
  it("keeps the domain and the raw input out of titles and descriptions", () => {
    for (const locale of LOCALES) {
      const chrome = CHROME[locale];
      const text = [
        chrome.homeTitle,
        chrome.homeDescription,
        ...Object.values(chrome.toolTitles),
        ...Object.values(chrome.toolDescriptions),
      ].join(" ");
      expect(text).not.toMatch(/originalInput|scanId/);
    }
  });

  it("makes each language page its own canonical and links the others", () => {
    const tool = localeAlternates("uz", "/whois");
    expect(tool.canonical).toBe("https://2check.uz/uz/whois");
    expect(tool.languages.ru).toBe("https://2check.uz/ru/whois");
    expect(tool.languages.uz).toBe("https://2check.uz/uz/whois");
    expect(tool.languages.en).toBe("https://2check.uz/en/whois");
  });

  /**
   * PRD 24.1 — "/" is the only locale-less route that exists, so it is the only page that may
   * name an x-default. A tool page that published one would point it at a URL that 404s.
   */
  it("names an x-default only for the neutral entry point", () => {
    expect(alternates("").languages["x-default"]).toBe("https://2check.uz/");
    for (const path of INDEXABLE_PATHS.filter((value) => value !== "")) {
      expect(alternates(path).languages["x-default"]).toBeUndefined();
      for (const locale of LOCALES) {
        expect(localeAlternates(locale, path).languages["x-default"]).toBeUndefined();
      }
    }
  });
});

/**
 * PRD 13.6 and AC-13.7 — the interface strings, not only the message catalogue, exist in every
 * mandatory language. The Uzbek chrome once shipped as a verbatim copy of the English one, which
 * type checking cannot catch; these tests can.
 */
describe("AC-13.7 — the interface is translated, not duplicated", () => {
  function strings(locale: (typeof LOCALES)[number]): string[] {
    const chrome = CHROME[locale];
    return [
      chrome.tagline,
      chrome.homeTitle,
      chrome.homeDescription,
      chrome.scanTitle,
      chrome.scanMissing,
      ...Object.values(chrome.toolTitles),
      ...Object.values(chrome.toolDescriptions),
      ...Object.values(chrome.toolBody).flat(),
      ...Object.values(chrome.ui).flatMap((value) =>
        typeof value === "string" ? [value] : Object.values(value),
      ),
    ];
  }

  it("leaves no interface string empty in any language", () => {
    for (const locale of LOCALES) {
      for (const value of strings(locale)) {
        expect(value.trim()).not.toBe("");
      }
    }
  });

  it("does not serve the English copy under another language", () => {
    const en = strings("en");
    for (const locale of LOCALES.filter((value) => value !== "en")) {
      const shared = strings(locale).filter((value, index) => value === en[index]);
      // Only strings that are the same word in every language may coincide.
      expect(shared).toEqual(shared.filter((value) => /^[A-Za-z0-9./ ]+$/.test(value)));
    }
  });
});

/**
 * PRD 24.1 — "/" is the neutral entry point, so it has to choose a language for a reader who
 * has not chosen one. The explicit choice always wins; otherwise the browser decides.
 */
describe("PRD 24.1 — the neutral entry point negotiates a language", () => {
  it("honours an explicit choice over the browser", () => {
    expect(negotiateLocale("en-GB,en;q=0.9", "uz")).toBe("uz");
    expect(negotiateLocale(null, "en")).toBe("en");
  });

  it("ignores a cookie that is not one of the served locales", () => {
    expect(negotiateLocale("en-GB,en;q=0.9", "de")).toBe("en");
    expect(negotiateLocale("en-GB,en;q=0.9", "../ru")).toBe("en");
  });

  it("reads the browser's order and quality values", () => {
    expect(negotiateLocale("uz-UZ,uz;q=0.9,ru;q=0.8,en;q=0.7")).toBe("uz");
    expect(negotiateLocale("en-US;q=0.6,ru-RU;q=0.9")).toBe("ru");
    expect(negotiateLocale("en-GB,en")).toBe("en");
  });

  it("matches on the primary subtag, whatever the script", () => {
    expect(negotiateLocale("uz-Cyrl-UZ")).toBe("uz");
    expect(negotiateLocale("uz-Latn")).toBe("uz");
  });

  it("falls back to Russian for anything it does not serve", () => {
    expect(negotiateLocale(null)).toBe("ru");
    expect(negotiateLocale("")).toBe("ru");
    expect(negotiateLocale("de-DE,fr;q=0.8")).toBe("ru");
    expect(negotiateLocale("*")).toBe("ru");
    // A zero quality value is an explicit refusal, not a preference.
    expect(negotiateLocale("en;q=0,uz;q=0.5")).toBe("uz");
  });
});
