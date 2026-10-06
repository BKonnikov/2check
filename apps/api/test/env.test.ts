import { describe, expect, it } from "vitest";
import { ConfigurationError, loadEnv } from "../src/config/env.js";

const complete = {
  REDIS_URL: "redis://127.0.0.1:6379",
  DATABASE_URL: "postgres://twocheck:twocheck@127.0.0.1:5432/twocheck",
  APPLICATION_RELEASE_VERSION: "0.0.0-test",
};

describe("startup configuration", () => {
  it("fails early instead of substituting a hidden fallback", () => {
    expect(() => loadEnv({})).toThrow(ConfigurationError);
  });

  it("rejects a port outside the valid range", () => {
    expect(() => loadEnv({ ...complete, API_PORT: "70000" })).toThrow(ConfigurationError);
  });

  it("accepts a complete configuration", () => {
    const env = loadEnv(complete);
    expect(env.NODE_ENV).toBe("development");
    expect(env.API_PORT).toBe(3001);
  });

  /**
   * 1.1 §7.6 — a deployment that cannot open outbound SMTP looks from inside exactly like a mail
   * server that will not answer. Defaulting to off is what makes the difference reportable: a
   * deployment that can probe says so, instead of one that cannot finding out one timeout at a
   * time and publishing each as a fault of somebody's domain.
   */
  it("leaves the outbound mail probe off until a deployment says it can", () => {
    expect(loadEnv(complete).EMAIL_SMTP_PROBE_ENABLED).toBe(false);
    expect(
      loadEnv({ ...complete, EMAIL_SMTP_PROBE_ENABLED: "true" }).EMAIL_SMTP_PROBE_ENABLED,
    ).toBe(true);
  });

  it("refuses a value that is neither true nor false, rather than reading it as off", () => {
    expect(() => loadEnv({ ...complete, EMAIL_SMTP_PROBE_ENABLED: "yes" })).toThrow(
      ConfigurationError,
    );
  });
});
