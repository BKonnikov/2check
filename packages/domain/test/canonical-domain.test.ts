import { describe, expect, it } from "vitest";
import { type CanonicalizationResult, canonicalizeDomain } from "../src/canonical-domain.js";

function accepted(input: string) {
  const result: CanonicalizationResult = canonicalizeDomain(input);
  if (!result.ok) {
    throw new Error(`expected "${input}" to be accepted, got ${result.code}`);
  }
  return result.domain;
}

function rejection(input: string) {
  const result: CanonicalizationResult = canonicalizeDomain(input);
  if (result.ok) {
    throw new Error(`expected "${input}" to be rejected`);
  }
  return result.code;
}

describe("AC-5.3 — rejected input", () => {
  it.each([
    ["", "input_empty"],
    ["   ", "input_empty"],
    ["192.168.1.1", "input_ip_address"],
    ["8.8.8.8", "input_ip_address"],
    ["[::1]", "input_ip_address"],
    ["*.example.uz", "input_wildcard_hostname"],
    ["user@example.uz", "input_email_address"],
    ["uz", "input_single_label"],
    ["example", "input_single_label"],
    ["example.uz:8443", "input_port_not_allowed"],
    ["https://example.uz:8443", "input_port_not_allowed"],
    ["https://user:pass@example.uz", "input_credentials_present"],
    ["ftp://example.uz", "input_scheme_unsupported"],
    ["mailto:someone@example.uz", "input_scheme_unsupported"],
    ["_dmarc.example.uz", "input_hostname_invalid"],
    ["exa mple.uz", "input_hostname_invalid"],
    [`${"a".repeat(64)}.uz`, "input_hostname_invalid"],
  ])("rejects %j as %s", (input, code) => {
    expect(rejection(input)).toBe(code);
  });

  it("accepts a default port, which URL normalization removes", () => {
    expect(accepted("https://example.uz:443").asciiHostname).toBe("example.uz");
  });
});

describe("AC-5.4 — UTS #46 Nontransitional and punycode", () => {
  it("converts a Unicode hostname to punycode and back", () => {
    const domain = accepted("пример.uz");
    expect(domain.asciiHostname).toBe("xn--e1afmkfd.uz");
    expect(domain.unicodeHostname).toBe("пример.uz");
    expect(domain.isIdn).toBe(true);
  });

  it("accepts punycode input and restores its Unicode form", () => {
    const domain = accepted("xn--e1afmkfd.uz");
    expect(domain.asciiHostname).toBe("xn--e1afmkfd.uz");
    expect(domain.unicodeHostname).toBe("пример.uz");
  });

  it("keeps sharp s distinct from ss, which transitional processing would fold", () => {
    const domain = accepted("faß.de");
    expect(domain.asciiHostname).toBe("xn--fa-hia.de");
    expect(domain.asciiHostname).not.toBe("fass.de");
  });

  it("marks a plain ASCII hostname as not IDN", () => {
    expect(accepted("example.uz").isIdn).toBe(false);
  });
});

describe("AC-5.5 — public suffix classification", () => {
  it("reports an ICANN suffix", () => {
    const domain = accepted("shop.example.uz");
    expect(domain.publicSuffix).toBe("uz");
    expect(domain.publicSuffixType).toBe("ICANN");
    expect(domain.registrableDomain).toBe("example.uz");
    expect(domain.labels).toEqual(["shop", "example", "uz"]);
  });

  it("reports a private suffix", () => {
    const domain = accepted("foo.blogspot.com");
    expect(domain.publicSuffix).toBe("blogspot.com");
    expect(domain.publicSuffixType).toBe("PRIVATE");
    expect(domain.registrableDomain).toBe("foo.blogspot.com");
  });

  it("reports UNKNOWN without inventing a boundary the list never asserted", () => {
    const domain = accepted("example.unknowntldxyz");
    expect(domain.publicSuffixType).toBe("UNKNOWN");
    expect(domain.publicSuffix).toBeNull();
    expect(domain.registrableDomain).toBeNull();
  });
});

describe("AC-5.1 and AC-5.2 — input shape and object boundary", () => {
  it.each([
    ["example.uz", "HOSTNAME"],
    ["https://example.uz/path", "URL"],
    ["http://example.uz", "URL"],
    ["example.uz/path", "URL_LIKE"],
    ["//example.uz", "URL_LIKE"],
  ])("classifies %j as %s", (input, inputType) => {
    expect(accepted(input).inputType).toBe(inputType);
  });

  it("lowercases and keeps the original input verbatim", () => {
    const domain = accepted("HTTPS://EXAMPLE.UZ/path");
    expect(domain.asciiHostname).toBe("example.uz");
    expect(domain.originalInput).toBe("HTTPS://EXAMPLE.UZ/path");
  });

  it("records a trailing dot instead of failing on it", () => {
    const domain = accepted("example.uz.");
    expect(domain.hadTrailingDot).toBe(true);
    expect(domain.asciiHostname).toBe("example.uz");
  });

  it("excludes registryDomain, which belongs to the registry module", () => {
    expect("registryDomain" in accepted("example.uz")).toBe(false);
  });
});

describe("AC-5.6 — no typo correction", () => {
  it("returns a misspelled hostname unchanged and suggests nothing", () => {
    const domain = accepted("exmaple.uz");
    expect(domain.asciiHostname).toBe("exmaple.uz");
    expect(Object.keys(domain)).not.toContain("suggestion");
  });
});
