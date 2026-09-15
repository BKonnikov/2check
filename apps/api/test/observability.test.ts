import { describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { type Env, loadEnv } from "../src/config/env.js";
import { REDACTED_PATHS, requestSerializer } from "../src/observability/logging.js";
import { createMetrics, FORBIDDEN_LABELS, METRIC_NAMES } from "../src/observability/metrics.js";

const env: Env = loadEnv({
  LOG_LEVEL: "silent",
  REDIS_URL: "redis://127.0.0.1:6379",
  DATABASE_URL: "postgres://twocheck:twocheck@127.0.0.1:5432/twocheck",
  APPLICATION_RELEASE_VERSION: "0.0.0-test",
});

describe("AC-21.2 — canonical metric names", () => {
  it("suffixes every counter with _total", () => {
    for (const name of METRIC_NAMES) {
      expect(name.endsWith("_total")).toBe(true);
    }
  });

  it("covers the signals PRD 21.4 names", () => {
    for (const name of [
      "cache_lookup_total",
      "singleflight_join_total",
      "security_validation_total",
      "ssrf_policy_block_total",
      "scan_started_total",
      "scan_failed_total",
    ]) {
      expect(METRIC_NAMES).toContain(name);
    }
  });
});

describe("AC-21.4 — unbounded labels are refused", () => {
  it.each([...FORBIDDEN_LABELS])("refuses the label %s", (label) => {
    const metrics = createMetrics();
    expect(() => metrics.increment("scan_started_total", { [label]: "anything" })).toThrow(
      /unbounded cardinality/,
    );
  });

  it("accepts bounded labels and renders them", () => {
    const metrics = createMetrics();
    metrics.increment("cache_lookup_total", { module: "dns", outcome: "hit" });
    metrics.increment("cache_lookup_total", { module: "dns", outcome: "hit" });
    expect(metrics.render()).toContain('cache_lookup_total{module="dns",outcome="hit"} 2');
  });

  it("refuses a forbidden label whatever its casing", () => {
    const metrics = createMetrics();
    expect(() => metrics.increment("scan_started_total", { scanId: "x" })).toThrow();
    expect(() => metrics.increment("scan_started_total", { Hostname: "x" })).toThrow();
  });
});

describe("AC-21.3 — logs exclude sensitive values", () => {
  it("redacts the raw input, registrant data, provider bodies and session secrets", () => {
    for (const path of [
      "originalInput",
      "registrant",
      "raw",
      "req.headers.authorization",
      "req.headers.cookie",
      "internalInfrastructureDenylist",
    ]) {
      expect(REDACTED_PATHS).toContain(path);
    }
  });

  it("logs the route template rather than the URL, so a scanId never reaches the log", () => {
    const serialized = requestSerializer({
      method: "GET",
      routeOptions: { url: "/api/web/v1/scans/:scanId" },
    });
    expect(serialized).toEqual({ method: "GET", route: "/api/web/v1/scans/:scanId" });
    expect(JSON.stringify(serialized)).not.toContain("?");
  });
});

describe("AC-21.5 and AC-21.6 — readiness distinguishes required from degrading", () => {
  it("withholds traffic when a required dependency is invalid", async () => {
    const app = buildApp({
      env,
      probes: [
        {
          name: "scan-store",
          required: true,
          check: async () => {
            throw new Error("incompatible schema");
          },
        },
      ],
    });
    const response = await app.inject({ method: "GET", url: "/readyz" });
    expect(response.statusCode).toBe(503);
    expect(response.json().status).toBe("NOT_READY");
    await app.close();
  });

  it("stays ready but degraded when the cache is unavailable", async () => {
    const app = buildApp({
      env,
      probes: [
        { name: "scan-store", required: true, check: async () => undefined },
        {
          name: "reusable-cache",
          required: false,
          check: async () => {
            throw new Error("redis unreachable");
          },
        },
      ],
    });
    const response = await app.inject({ method: "GET", url: "/readyz" });
    expect(response.statusCode).toBe(200);
    expect(response.json().status).toBe("DEGRADED");
    await app.close();
  });
});

describe("AC-21.1 and AC-21.7 — platform health is not domain health", () => {
  it("exposes only platform counters, none of which name a domain", async () => {
    const app = buildApp({ env });
    const response = await app.inject({ method: "GET", url: "/metrics" });
    expect(response.statusCode).toBe(200);
    expect(response.body).not.toMatch(/example\.uz|hostname=|scanId/);
    await app.close();
  });
});
