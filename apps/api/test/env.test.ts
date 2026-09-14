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
});
