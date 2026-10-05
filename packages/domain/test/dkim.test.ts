import { describe, expect, it } from "vitest";
import {
  analyseDkim,
  DKIM_CHECK_IDS,
  DKIM_MAX_SELECTORS_PER_SCAN,
  DKIM_MIN_RSA_BITS,
  type DkimLookupAnswer,
  type DkimSelector,
  dkimSelectors,
  evaluateDkimCheck,
  parseDkimKey,
  recogniseMailProvider,
  rsaKeyBits,
} from "../src/index.js";

const FRESHNESS = { checkedAt: "2026-10-05T00:00:00.000Z", cached: false, cacheAge: 0 } as const;

/** Real keys, generated once with openssl, so the DER walk is tested against the real shape. */
const RSA_2048_SPKI =
  "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAmG1javSGSFFzqR4KGGKsiNnMipYtbWR7RA7MDLeLbJeLYw4n1UhYqRPvoM3yMgHSRh01T5JSkzJVqyCPbxcKXfJcVppbmfzxPah7hBGUcF85j5A+kI4S2rruj1u3aFMd8iLgYA26qO2LlkXi3CpJ0MFXDU00LKJkpBjV5BL6a1pepgRa3LgJiu4vqqAQL3Hn37+safjVJhOvkKScDRPWf95X61mrkcAoxTdw7C2JCtFcXko0zEQAppaFv16bcL4pXoacOWCwBnS5lrWt/nPwxvf52DP3S346S9ZM4Ky3H2LeYV0hw+YHzGVctt4tCL/wyU4SBLBl62qPNKQI01TGywIDAQAB";
const RSA_2048_BARE =
  "MIIBCgKCAQEAmG1javSGSFFzqR4KGGKsiNnMipYtbWR7RA7MDLeLbJeLYw4n1UhYqRPvoM3yMgHSRh01T5JSkzJVqyCPbxcKXfJcVppbmfzxPah7hBGUcF85j5A+kI4S2rruj1u3aFMd8iLgYA26qO2LlkXi3CpJ0MFXDU00LKJkpBjV5BL6a1pepgRa3LgJiu4vqqAQL3Hn37+safjVJhOvkKScDRPWf95X61mrkcAoxTdw7C2JCtFcXko0zEQAppaFv16bcL4pXoacOWCwBnS5lrWt/nPwxvf52DP3S346S9ZM4Ky3H2LeYV0hw+YHzGVctt4tCL/wyU4SBLBl62qPNKQI01TGywIDAQAB";
const RSA_1024_SPKI =
  "MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC54RuwNnOOybm/CRFeeXxBmC51ihNCSxYOeH8ZDIom21ihS1myXEZ9nmJ9nVmOlbH48MvFf6AQUe2BsPCrrpqqiKjy1tuyISvBT5GvJesW+ngSwTlTxLypXa2lpCB2jn0WwZVVP9mFE6mUvSxJE3U0mKLygCEQi6sK3ED6G8yOsQIDAQAB";
const RSA_512_SPKI =
  "MFwwDQYJKoZIhvcNAQEBBQADSwAwSAJBAMAurHsw1IP24kALgZYw8qdO9laQwG26bn9S4OFFpwO48lbPNAb74ZIMm0iX1Px3uxjfcf88+t13kCVqvjP21jcCAwEAAQ==";
/** RFC 8463 — the raw 32-byte public key, not a wrapper. */
const ED25519 = "VI/mkf1i+H78uO20+tYQbrc4Hj+ODbIN7kGXa0t1a2o=";

function answer(...records: string[]): DkimLookupAnswer {
  return { outcome: "ANSWER", records };
}

function user(selector: string): readonly DkimSelector[] {
  return [{ selector, origin: "USER" }];
}

function service(...selectors: string[]): readonly DkimSelector[] {
  return selectors.map((selector) => ({ selector, origin: "SERVICE" as const }));
}

async function run(
  selectors: readonly DkimSelector[],
  zone: Readonly<Record<string, DkimLookupAnswer>> = {},
) {
  const asked: string[] = [];
  const analysis = await analyseDkim({
    domain: "example.uz",
    selectors,
    lookup: async (name) => {
      asked.push(name);
      return zone[name] ?? { outcome: "NAME_NOT_FOUND" };
    },
  });
  return {
    analysis,
    asked,
    result: evaluateDkimCheck(analysis, { domain: "example.uz", freshness: FRESHNESS }),
  };
}

function record(...tags: string[]): DkimLookupAnswer {
  return answer(tags.join("; "));
}

describe("AC-5.1 and AC-5.2 — where the selectors come from", () => {
  it("puts the user's selector before the service's", () => {
    expect(dkimSelectors({ provided: "mine", service: ["selector1", "selector2"] })).toEqual([
      { selector: "mine", origin: "USER" },
      { selector: "selector1", origin: "SERVICE" },
      { selector: "selector2", origin: "SERVICE" },
    ]);
  });

  it("keeps one entry when the user names a selector the service also uses", () => {
    expect(dkimSelectors({ provided: "Google", service: ["google"] })).toEqual([
      { selector: "google", origin: "USER" },
    ]);
  });

  it("asks for no more than eight names", () => {
    const many = Array.from({ length: 20 }, (_, index) => `s${index}`);
    expect(dkimSelectors({ service: many })).toHaveLength(DKIM_MAX_SELECTORS_PER_SCAN);
  });

  it("has nothing to ask when neither source names a selector", () => {
    expect(dkimSelectors({})).toEqual([]);
  });

  it("reads the selectors of a service the MX records name", () => {
    const provider = recogniseMailProvider(["10 aspmx.l.google.com"]);
    expect(provider?.dkimSelectors).toEqual(["google"]);
  });

  it("leaves a service that generates its selectors per tenant without any", () => {
    expect(recogniseMailProvider(["10 mail.example.pphosted.com"])?.dkimSelectors).toBeUndefined();
  });
});

describe("AC-5.3 to AC-5.7 — what is checked in the key", () => {
  it("passes a key of the recommended length", async () => {
    const { result } = await run(service("google"), {
      "google._domainkey.example.uz": record("v=DKIM1", "k=rsa", `p=${RSA_2048_SPKI}`),
    });
    expect(result.status).toBe("PASS");
    expect(result.message.titleCode).toBe("email.dkim.key.present");
  });

  it("reads a key published as a bare RSAPublicKey as well as a wrapped one", () => {
    expect(rsaKeyBits(RSA_2048_SPKI)).toBe(2048);
    expect(rsaKeyBits(RSA_2048_BARE)).toBe(2048);
  });

  it("passes a key exactly at the limit", async () => {
    expect(rsaKeyBits(RSA_1024_SPKI)).toBe(DKIM_MIN_RSA_BITS);
    const { result } = await run(service("google"), {
      "google._domainkey.example.uz": record("v=DKIM1", `p=${RSA_1024_SPKI}`),
    });
    expect(result.status).toBe("PASS");
  });

  it("fails a key shorter than the limit, and says how short", async () => {
    const { result } = await run(service("google"), {
      "google._domainkey.example.uz": record("v=DKIM1", `p=${RSA_512_SPKI}`),
    });
    expect(result.status).toBe("FAIL");
    expect(result.severity).toBe("critical");
    expect(result.message.params).toMatchObject({ bits: 512, limit: DKIM_MIN_RSA_BITS });
  });

  it("fails an empty key tag as a revoked key", async () => {
    const { result } = await run(service("google"), {
      "google._domainkey.example.uz": record("v=DKIM1", "p="),
    });
    expect(result.status).toBe("FAIL");
    expect(result.severity).toBe("critical");
    expect(result.message.titleCode).toBe("email.dkim.key.fail.revoked");
  });

  it("fails a key that admits sha1 and nothing else", async () => {
    const { result } = await run(service("google"), {
      "google._domainkey.example.uz": record("v=DKIM1", "h=sha1", `p=${RSA_2048_SPKI}`),
    });
    expect(result.status).toBe("FAIL");
    expect(result.severity).toBe("critical");
    expect(result.message.titleCode).toBe("email.dkim.key.fail.sha1");
  });

  it("passes a key that admits sha1 alongside sha256", async () => {
    const { result } = await run(service("google"), {
      "google._domainkey.example.uz": record("v=DKIM1", "h=sha256:sha1", `p=${RSA_2048_SPKI}`),
    });
    expect(result.status).toBe("PASS");
  });

  it("warns about a key declared as a test key", async () => {
    const { result } = await run(service("google"), {
      "google._domainkey.example.uz": record("v=DKIM1", "t=y", `p=${RSA_2048_SPKI}`),
    });
    expect(result.status).toBe("FAIL");
    expect(result.severity).toBe("warning");
    expect(result.message.titleCode).toBe("email.dkim.key.fail.testing");
  });

  it("does not take the s flag for the y flag", async () => {
    const { result } = await run(service("google"), {
      "google._domainkey.example.uz": record("v=DKIM1", "t=s", `p=${RSA_2048_SPKI}`),
    });
    expect(result.status).toBe("PASS");
  });

  it("accepts an ed25519 key and applies no length limit to it", async () => {
    const { analysis, result } = await run(service("google"), {
      "google._domainkey.example.uz": record("v=DKIM1", "k=ed25519", `p=${ED25519}`),
    });
    expect(analysis.key?.keyType).toBe("ed25519");
    expect(analysis.key?.bits).toBeUndefined();
    expect(result.status).toBe("PASS");
  });

  it("reports a record it cannot read as unreadable rather than as absent", async () => {
    const { result } = await run(service("google"), {
      "google._domainkey.example.uz": answer("v=DKIM2; p=abc"),
    });
    expect(result.status).toBe("FAIL");
    expect(result.message.titleCode).toBe("email.dkim.key.fail.unreadable");
  });

  it("treats a record with no key tag as unreadable", () => {
    expect(parseDkimKey("v=DKIM1; k=rsa")).toBeUndefined();
  });

  it("accepts a record that omits the optional version tag", () => {
    expect(parseDkimKey(`k=rsa; p=${RSA_2048_SPKI}`)?.bits).toBe(2048);
  });
});

describe("AC-5.8 to AC-5.10 — when no key is found", () => {
  it("returns UNKNOWN when the names came from the service table", async () => {
    const { result } = await run(service("selector1", "selector2"));
    expect(result.status).toBe("UNKNOWN");
    expect(result.reasonCode).toBe("dkim_selector_unknown");
    expect(result.message.params?.selectors).toBe("selector1, selector2");
  });

  it("returns FAIL when the name was the one the user gave", async () => {
    const { result } = await run(user("mine"));
    expect(result.status).toBe("FAIL");
    expect(result.severity).toBe("warning");
    expect(result.message.params?.selector).toBe("mine");
  });

  it("stays UNKNOWN when the user's selector was tried alongside the service's", async () => {
    // 1.1 §5.5 — absence is established for the name the user gave, and these other names leave
    // the question open, so the result cannot be the stronger of the two.
    const { result } = await run([...user("mine"), ...service("google")]);
    expect(result.status).toBe("UNKNOWN");
  });

  it("returns UNKNOWN with no names asked when there was nothing to ask for", async () => {
    const { analysis, asked, result } = await run([]);
    expect(analysis.state).toBe("NOTHING_TO_ASK");
    expect(asked).toEqual([]);
    expect(result.status).toBe("UNKNOWN");
    expect(result.message.titleCode).toBe("email.dkim.key.unknown.nothing");
  });

  it("distinguishes a query that did not complete from a name without a record", async () => {
    const { result } = await run(service("google"), {
      "google._domainkey.example.uz": { outcome: "INDETERMINATE" },
    });
    expect(result.status).toBe("UNKNOWN");
    expect(result.reasonCode).toBe("dkim_lookup_failed");
  });

  it("reports the names it asked for, and stops at the first key it finds", async () => {
    const { analysis, asked } = await run(service("a", "b", "c"), {
      "b._domainkey.example.uz": record("v=DKIM1", `p=${RSA_2048_SPKI}`),
    });
    expect(asked).toEqual(["a._domainkey.example.uz", "b._domainkey.example.uz"]);
    expect(analysis.triedNames).toEqual(asked);
    expect(analysis.selector).toBe("b");
  });

  it("goes on past a name whose record cannot be read", async () => {
    const { analysis } = await run(service("a", "b"), {
      "a._domainkey.example.uz": answer("v=DKIM2; p=abc"),
      "b._domainkey.example.uz": record("v=DKIM1", `p=${RSA_2048_SPKI}`),
    });
    expect(analysis.state).toBe("USABLE");
    expect(analysis.selector).toBe("b");
  });
});

describe("1.1 §9 — the shape of the result", () => {
  it("names the selector it queried as part of the check target", async () => {
    const { result } = await run(service("google"), {
      "google._domainkey.example.uz": record("v=DKIM1", `p=${RSA_2048_SPKI}`),
    });
    expect(result.target).toEqual({
      kind: "EMAIL_POLICY",
      policy: "DKIM",
      queriedName: "google._domainkey.example.uz",
    });
    expect(result.checkId).toBe(DKIM_CHECK_IDS.key);
  });

  it("keeps the key material out of the result", async () => {
    const { result } = await run(service("google"), {
      "google._domainkey.example.uz": record("v=DKIM1", `p=${RSA_2048_SPKI}`),
    });
    expect(JSON.stringify(result)).not.toContain(RSA_2048_SPKI.slice(0, 40));
  });
});

describe("the key reader refuses what it cannot parse", () => {
  it.each(["", "not base64 at all !!", "AAAA", "MIIBIjANBgkq"])(
    "returns no length for %s",
    (value) => {
      expect(rsaKeyBits(value)).toBeUndefined();
    },
  );

  it("returns no length for an ed25519 key, which is not a DER structure", () => {
    expect(rsaKeyBits(ED25519)).toBeUndefined();
  });
});
