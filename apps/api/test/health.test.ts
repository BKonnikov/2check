import { describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { type Env, loadEnv } from "../src/config/env.js";

const env: Env = loadEnv({
  LOG_LEVEL: "silent",
  REDIS_URL: "redis://127.0.0.1:6379",
  DATABASE_URL: "postgres://twocheck:twocheck@127.0.0.1:5432/twocheck",
  APPLICATION_RELEASE_VERSION: "0.0.0-test",
});

describe("liveness", () => {
  it("answers without inspecting dependencies", async () => {
    const app = buildApp({ env });
    const response = await app.inject({ method: "GET", url: "/healthz" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok", release: "0.0.0-test" });
    await app.close();
  });
});

describe("readiness", () => {
  it("is ready when every probe succeeds", async () => {
    const app = buildApp({
      env,
      probes: [{ name: "scan-store", check: async () => undefined }],
    });
    const response = await app.inject({ method: "GET", url: "/readyz" });
    expect(response.statusCode).toBe(200);
    expect(response.json().ready).toBe(true);
    await app.close();
  });

  it("withholds readiness when a required dependency fails", async () => {
    const app = buildApp({
      env,
      probes: [
        {
          name: "scan-store",
          check: async () => {
            throw new Error("scan store unavailable");
          },
        },
      ],
    });
    const response = await app.inject({ method: "GET", url: "/readyz" });
    expect(response.statusCode).toBe(503);
    expect(response.json().ready).toBe(false);
    await app.close();
  });
});
