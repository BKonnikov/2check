import type { WebScanResponse } from "@2check/contracts";
import type { SpfLookupAnswer } from "@2check/domain";
import { describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { type Env, loadEnv } from "../src/config/env.js";

const env: Env = loadEnv({
  LOG_LEVEL: "silent",
  REDIS_URL: "redis://127.0.0.1:6379",
  DATABASE_URL: "postgres://twocheck:twocheck@127.0.0.1:5432/twocheck",
  APPLICATION_RELEASE_VERSION: "0.0.0-test",
});

/**
 * 1.1 §3 — the mail category end to end, over a zone recorded in advance. The root record comes
 * through the same port as the names it leads to, so one fixture holds the whole walk.
 */
function app(zone: Readonly<Record<string, SpfLookupAnswer>>) {
  return buildApp({
    env,
    spfLookup: () => ({
      provider: "fixture",
      lookup: async (name) => zone[name] ?? { outcome: "NAME_NOT_FOUND" },
    }),
  });
}

function answer(...records: string[]): SpfLookupAnswer {
  return { outcome: "ANSWER", records };
}

async function scan(zone: Readonly<Record<string, SpfLookupAnswer>>) {
  const instance = app(zone);
  const created = await instance.inject({
    method: "POST",
    url: "/api/web/v1/scans",
    payload: { input: "example.uz", mode: "PARTIAL", selectedCategories: ["email"] },
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

describe("1.1 §14 — a PARTIAL scan of the mail category", () => {
  it("is accepted and produces the category", async () => {
    const body = await scan({ "example.uz": answer("v=spf1 ip4:203.0.113.0/24 -all") });
    expect(body.executionState).toBe("COMPLETED");
    const email = body.categories?.find((category) => category.category === "email");
    expect(email?.status).toBe("PASS");
    expect(email?.checks.map((check) => check.checkId)).toEqual([
      "email.spf.record",
      "email.spf.limits",
      "email.spf.policy",
      "email.spf.deprecated",
    ]);
  });

  it("carries no overall score or verdict, as a PARTIAL scan does not", async () => {
    // AC-14.7, and PRD 3.4 before it.
    const body = await scan({ "example.uz": answer("v=spf1 -all") });
    expect(body.summary?.score).toBeUndefined();
    expect(body.summary?.verdictCode).toBeUndefined();
  });

  it("reports a domain with no policy as a confirmed finding", async () => {
    const body = await scan({ "example.uz": { outcome: "EMPTY" } });
    const email = body.categories?.find((category) => category.category === "email");
    expect(email?.status).toBe("FAIL");
    expect(email?.severity).toBe("warning");
    expect(email?.completeness).toBe("COMPLETE");
  });

  it("walks the names a record leads to and reports what it spent", async () => {
    const body = await scan({
      "example.uz": answer("v=spf1 include:mail.uz -all"),
      "mail.uz": answer("v=spf1 a mx -all"),
    });
    const email = body.categories?.find((category) => category.category === "email");
    const limits = email?.checks.find((check) => check.checkId === "email.spf.limits");
    expect(limits?.status).toBe("PASS");
    expect(limits?.message.params).toEqual({ count: 3, limit: 10 });
  });

  it("reports a walk it could not finish as incomplete rather than as a failure", async () => {
    const body = await scan({
      "example.uz": answer("v=spf1 include:unreachable.uz -all"),
      "unreachable.uz": { outcome: "INDETERMINATE" },
    });
    const email = body.categories?.find((category) => category.category === "email");
    const limits = email?.checks.find((check) => check.checkId === "email.spf.limits");
    expect(limits?.status).toBe("UNKNOWN");
    expect(email?.completeness).toBe("PARTIAL");
  });

  it("publishes no detail fields for the category yet", async () => {
    // 1.1 §9.4 — a field reaches the reader only once a check actually produces one.
    const body = await scan({ "example.uz": answer("v=spf1 -all") });
    const email = body.categories?.find((category) => category.category === "email");
    for (const check of email?.checks ?? []) {
      expect(check.details).toBeUndefined();
    }
  });
});
