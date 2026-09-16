import { describe, expect, it } from "vitest";
import { recogniseMailProvider, recogniseServices, recogniseTxtServices } from "../src/services.js";

/** The MX set olx.uz actually publishes. */
const OLX_MX = [
  "50 alt4.aspmx.l.google.com",
  "60 web5.torg.uz",
  "40 alt3.aspmx.l.google.com",
  "20 alt1.aspmx.l.google.com",
  "30 alt2.aspmx.l.google.com",
  "10 aspmx.l.google.com",
];

describe("PRD 8.3 — reading where the mail goes", () => {
  it("names the mail service the exchangers point at", () => {
    expect(recogniseMailProvider(OLX_MX)).toEqual({ name: "Google Workspace", kind: "mail" });
  });

  it.each([
    ["Microsoft 365", ["0 example-uz.mail.protection.outlook.com"]],
    ["Yandex 360", ["10 mx.yandex.net."]],
    ["VK WorkMail", ["10 emx.mail.ru"]],
    ["Zoho Mail", ["10 mx.zoho.com"]],
  ])("recognises %s", (name, values) => {
    expect(recogniseMailProvider(values)?.name).toBe(name);
  });

  it("says nothing about a host it does not know", () => {
    expect(recogniseMailProvider(["10 mail.example.uz"])).toBeUndefined();
  });

  it("is not fooled by a hostname that merely contains a known one", () => {
    // A domain may publish its own host; only the exchanger's own suffix counts.
    expect(recogniseMailProvider(["10 mail.notgoogle.uz"])).toBeUndefined();
  });
});

describe("PRD 8.3 — reading the tokens in TXT", () => {
  const OLX_TXT = [
    "v=spf1 ip4:195.158.29.128/27 a:newmailers.olx.uz include:amazonses.com include:_spf.google.com include:mail.zendesk.com -all",
    "google-site-verification=xsOzXuwYXPTYn73HYj6DaXXXZU3FAfMenG28v3lB16g",
    "yandex-verification: 5d98b11602e19321",
    "atlassian-domain-verification=-GLKVis0YQdW1pkYDLsuHo2C3sIz3BnfOqDltwFfrhdppJyczq3lp6iVO9OCkowZ",
    "apple-domain-verification=ZQBlivCoveABYda2",
    "MS=ms52392940",
    "ZOOM_verify_ULsvrxJbTbunl4G2xtgAqA",
    "lovable_verification=workspace_mgb27s7qf5eqewx9sc",
  ];

  it("names the senders and the verifications it recognises", () => {
    const names = recogniseTxtServices(OLX_TXT).map((service) => service.name);
    expect(names).toContain("Amazon SES");
    expect(names).toContain("Zendesk");
    expect(names).toContain("Google Search Console");
    expect(names).toContain("Yandex Webmaster");
    expect(names).toContain("Atlassian");
    expect(names).toContain("Zoom");
    expect(names).toContain("Lovable");
  });

  it("separates who may send mail from who asked for a token", () => {
    const services = recogniseTxtServices(OLX_TXT);
    const google = services.filter((service) => service.name.startsWith("Google"));
    expect(google.map((service) => service.kind).sort()).toEqual(["sender", "verification"]);
  });

  it("reports each service once, however many tokens it published", () => {
    const repeated = Array.from(
      { length: 6 },
      (_, index) => `google-site-verification=token${index}`,
    );
    expect(recogniseTxtServices(repeated)).toEqual([
      { name: "Google Search Console", kind: "verification" },
    ]);
  });

  it("returns nothing for records it does not recognise", () => {
    expect(recogniseTxtServices(["some-unknown-token=abc", "v=spf1 -all"])).toEqual([]);
  });
});

describe("recognition is per record type", () => {
  it("reads MX as delivery and TXT as tokens, and leaves A alone", () => {
    expect(recogniseServices("MX", { google: OLX_MX, cloudflare: OLX_MX })).toEqual([
      { name: "Google Workspace", kind: "mail" },
    ]);
    expect(recogniseServices("A", { google: ["93.184.216.34"] })).toEqual([]);
    expect(recogniseServices("TXT", { google: ["include:sendgrid.net"] })).toEqual([
      { name: "SendGrid", kind: "sender" },
    ]);
  });

  it("has nothing to say when nobody answered", () => {
    expect(recogniseServices("MX", {})).toEqual([]);
  });
});
