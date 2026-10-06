import type { WebScanResponse } from "@2check/contracts";
import type {
  DkimLookupAnswer,
  HostObservation,
  MxObservation,
  StarttlsOutcome,
  TlsCertificate,
} from "@2check/domain";
import { describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { createInMemoryCache } from "../src/cache/reusable-cache.js";
import { type Env, loadEnv } from "../src/config/env.js";

const env: Env = loadEnv({
  LOG_LEVEL: "silent",
  REDIS_URL: "redis://127.0.0.1:6379",
  DATABASE_URL: "postgres://twocheck:twocheck@127.0.0.1:5432/twocheck",
  APPLICATION_RELEASE_VERSION: "0.0.0-test",
});

/**
 * 1.1 §12 — the category's cache, over the whole stack.
 *
 * Every port counts the names it was asked for, so a test can say what a second scan did not ask
 * again. That is the only way to tell reuse from a coincidence of equal results.
 */
interface Zone {
  readonly txt: Readonly<Record<string, { outcome: string; records?: readonly string[] }>>;
  readonly mx: MxObservation;
  readonly addresses: Readonly<Record<string, HostObservation>>;
  readonly ptr: Readonly<Record<string, readonly string[]>>;
  readonly smtp: Readonly<Record<string, StarttlsOutcome>>;
}

function certificate(): TlsCertificate {
  return {
    subject: "mail.example.uz",
    issuer: "R11 (Let's Encrypt)",
    validFrom: "2020-01-01T00:00:00.000Z",
    validTo: "2099-01-01T00:00:00.000Z",
    subjectAltNames: ["DNS:mail.example.uz"],
    fingerprint256: "ab:cd",
    selfSigned: false,
    chainVerification: "TRUSTED",
  };
}

function answer(...records: string[]) {
  return { outcome: "ANSWER" as const, records };
}

const ZONE: Zone = {
  txt: {
    "example.uz": answer("v=spf1 ip4:93.184.216.0/24 -all"),
    "_dmarc.example.uz": answer("v=DMARC1; p=reject; rua=mailto:d@example.uz"),
    "mine._domainkey.example.uz": answer("v=DKIM1; k=rsa; p=AAAA"),
  },
  mx: { outcome: "ANSWER", records: [{ preference: 10, exchange: "mail.example.uz" }] },
  addresses: {
    "mail.example.uz": {
      hostname: "mail.example.uz",
      outcome: "ANSWER",
      addresses: ["93.184.216.34"],
    },
    "example.uz": { hostname: "example.uz", outcome: "ANSWER", addresses: ["93.184.216.35"] },
  },
  ptr: { "93.184.216.34": ["mail.example.uz"] },
  smtp: {
    "mail.example.uz": {
      kind: "SECURED",
      hostname: "mail.example.uz",
      address: "93.184.216.34",
      protocol: "TLSv1.3",
      certificate: certificate(),
      observedAt: "2026-10-06T11:00:00.000Z",
    },
  },
};

interface Counted {
  readonly txt: string[];
  readonly mx: string[];
  readonly addresses: string[];
  readonly reverse: string[];
  readonly smtp: string[];
}

function harness(zone: Zone = ZONE) {
  const cache = createInMemoryCache();
  const asked: Counted = { txt: [], mx: [], addresses: [], reverse: [], smtp: [] };
  const txt = async (name: string) => {
    asked.txt.push(name);
    return (zone.txt[name] ?? { outcome: "NAME_NOT_FOUND" }) as DkimLookupAnswer;
  };

  const app = () =>
    buildApp({
      env,
      cache,
      spfLookup: () => ({ provider: "fixture", lookup: txt }),
      dmarcLookup: () => ({ provider: "fixture", lookup: txt }),
      dkimLookup: () => ({ provider: "fixture", lookup: txt }),
      smtpProbeEnabled: true,
      smtpProbe: async (_address, hostname) => {
        asked.smtp.push(hostname);
        return zone.smtp[hostname] ?? { kind: "CONNECT_FAILED", hostname };
      },
      mailHostLookup: () => ({
        provider: "fixture",
        mx: async (domain) => {
          asked.mx.push(domain);
          return zone.mx;
        },
        addresses: async (name) => {
          asked.addresses.push(name);
          return (
            zone.addresses[name] ?? { hostname: name, outcome: "EMPTY" as const, addresses: [] }
          );
        },
        reverse: async (address) => {
          asked.reverse.push(address);
          const names = zone.ptr[address];
          return names === undefined
            ? { outcome: "NAME_NOT_FOUND" as const }
            : { outcome: "ANSWER" as const, names };
        },
      }),
    });

  async function scan(options: { selector?: string; forceRefresh?: boolean } = {}) {
    const instance = app();
    const created = await instance.inject({
      method: "POST",
      url: "/api/web/v1/scans",
      payload: {
        input: "example.uz",
        mode: "PARTIAL",
        selectedCategories: ["email"],
        ...(options.forceRefresh === true ? { cacheMode: "FORCE_REFRESH" } : {}),
        ...(options.selector === undefined ? {} : { dkimSelector: options.selector }),
      },
    });
    expect(created.statusCode).toBe(202);
    const { scanId } = created.json<{ scanId: string }>();
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const response = await instance.inject({ method: "GET", url: `/api/web/v1/scans/${scanId}` });
      const body = response.json<WebScanResponse>();
      if (body.executionState === "COMPLETED" || body.executionState === "FAILED") {
        await instance.close();
        return body;
      }
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    await instance.close();
    throw new Error("the scan did not finish");
  }

  function clear() {
    for (const list of Object.values(asked)) {
      list.length = 0;
    }
  }

  return { scan, asked, clear };
}

function check(body: WebScanResponse, checkId: string) {
  return body.categories
    ?.find((entry) => entry.category === "email")
    ?.checks.find((entry) => entry.checkId === checkId);
}

describe("1.1 §12 — the mail category reuses what it observed", () => {
  it("asks nothing again on a second scan of the same domain", async () => {
    const { scan, asked, clear } = harness();
    const first = await scan({ selector: "mine" });
    expect(first.executionState).toBe("COMPLETED");
    expect(asked.txt.length).toBeGreaterThan(0);

    clear();
    const second = await scan({ selector: "mine" });
    expect(second.executionState).toBe("COMPLETED");
    expect(asked).toEqual({ txt: [], mx: [], addresses: [], reverse: [], smtp: [] });
  });

  it("AC-12.4 — reports the time of the original observation, not of the cache read", async () => {
    const { scan, clear } = harness();
    const first = await scan({ selector: "mine" });
    const observedAt = check(first, "email.spf.record")?.freshness.checkedAt;
    expect(check(first, "email.spf.record")?.freshness.cached).toBe(false);

    clear();
    const second = await scan({ selector: "mine" });
    const reused = check(second, "email.spf.record")?.freshness;
    expect(reused?.cached).toBe(true);
    expect(reused?.checkedAt).toBe(observedAt);
  });

  it("PRD 14.2 — FORCE_REFRESH asks again, and keeps the rest of the cache", async () => {
    const { scan, asked, clear } = harness();
    await scan({ selector: "mine" });

    clear();
    await scan({ selector: "mine", forceRefresh: true });
    expect(asked.txt.length).toBeGreaterThan(0);
    expect(asked.smtp).toEqual(["mail.example.uz"]);

    clear();
    await scan({ selector: "mine" });
    expect(asked.txt).toEqual([]);
  });

  it("AC-12.3 — a result found under a given selector does not answer a scan without one", async () => {
    const { scan, asked, clear } = harness();
    await scan({ selector: "mine" });

    clear();
    const body = await scan();
    /**
     * The second scan named no selector and the MX records name no service we know, so it had
     * nothing to ask for — and in particular it did not read back the key the first scan stored
     * under the selector it was given.
     */
    expect(asked.txt).not.toContain("mine._domainkey.example.uz");
    const key = check(body, "email.dkim.key");
    expect(key?.status).toBe("UNKNOWN");
    expect(key?.reasonCode).toBe("dkim_selector_unknown");
  });

  it("AC-12.2 — does not store a DMARC walk that did not finish", async () => {
    const zone: Zone = {
      ...ZONE,
      txt: {
        ...ZONE.txt,
        "_dmarc.example.uz": { outcome: "EMPTY" },
        "_dmarc.uz": { outcome: "INDETERMINATE" },
      },
    };
    const { scan, asked, clear } = harness(zone);
    const first = await scan();
    expect(check(first, "email.dmarc.record")?.reasonCode).toBe("dmarc_tree_walk_incomplete");

    clear();
    const second = await scan();
    // The walk runs again rather than reading back an absence it never established.
    expect(asked.txt).toContain("_dmarc.example.uz");
    expect(check(second, "email.dmarc.record")?.freshness.cached).toBe(false);
  });

  it("AC-12.2 — does not store a probe that observed nothing", async () => {
    const zone: Zone = { ...ZONE, smtp: {} };
    const { scan, asked, clear } = harness(zone);
    const first = await scan();
    expect(check(first, "email.starttls.encryption")?.reasonCode).toBe("starttls_connect_failed");

    clear();
    await scan();
    expect(asked.smtp).toEqual(["mail.example.uz"]);
  });

  it("PRD 14.6 — does not reuse a probe against a host that now answers elsewhere", async () => {
    const { scan } = harness();
    await scan();

    // The same harness, a new cache-sharing instance, but the host has moved.
    const moved = harness({
      ...ZONE,
      addresses: {
        ...ZONE.addresses,
        "mail.example.uz": {
          hostname: "mail.example.uz",
          outcome: "ANSWER",
          addresses: ["93.184.216.99"],
        },
      },
    });
    await moved.scan();
    expect(moved.asked.smtp).toEqual(["mail.example.uz"]);
  });
});
