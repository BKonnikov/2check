import { describe, expect, it } from "vitest";
import { CHROME, INDEXABLE_PATHS, LOCALES, localeAlternates } from "../app/_components/chrome";
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
      expect(dns).toMatch(/не входит|not part of this version/i);
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
      expect(ssl).toMatch(/не входят|not part of this version/i);
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
    const alternates = localeAlternates("uz", "/whois");
    expect(alternates.canonical).toBe("https://2check.uz/uz/whois");
    expect(alternates.languages.ru).toBe("https://2check.uz/ru/whois");
    expect(alternates.languages["x-default"]).toBe("https://2check.uz/whois");
  });
});
