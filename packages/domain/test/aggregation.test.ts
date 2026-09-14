import { describe, expect, it } from "vitest";
import {
  aggregateCompleteness,
  aggregateSeverity,
  aggregateStatus,
  isAllowedStatusSeverity,
} from "../src/aggregation.js";

describe("aggregateStatus", () => {
  it("prefers FAIL over every other status", () => {
    expect(aggregateStatus(["PASS", "UNKNOWN", "FAIL", "NOT_APPLICABLE"])).toBe("FAIL");
  });

  it("prefers UNKNOWN over PASS", () => {
    expect(aggregateStatus(["PASS", "UNKNOWN"])).toBe("UNKNOWN");
  });

  it("returns NOT_APPLICABLE for an empty set", () => {
    expect(aggregateStatus([])).toBe("NOT_APPLICABLE");
  });
});

describe("aggregateCompleteness", () => {
  it("is PARTIAL when any child check is UNKNOWN", () => {
    expect(aggregateCompleteness(["PASS", "UNKNOWN"])).toBe("PARTIAL");
  });

  it("is not reduced by NOT_APPLICABLE", () => {
    expect(aggregateCompleteness(["PASS", "NOT_APPLICABLE"])).toBe("COMPLETE");
  });
});

describe("aggregateSeverity", () => {
  it("takes the strongest severity among failing checks", () => {
    expect(
      aggregateSeverity([
        { status: "FAIL", severity: "warning" },
        { status: "FAIL", severity: "critical" },
      ]),
    ).toBe("critical");
  });

  it("ignores the severity of checks that did not fail", () => {
    expect(
      aggregateSeverity([
        { status: "UNKNOWN", severity: "critical" },
        { status: "PASS", severity: "warning" },
      ]),
    ).toBe("none");
  });
});

describe("isAllowedStatusSeverity", () => {
  it("rejects FAIL with severity none", () => {
    expect(isAllowedStatusSeverity("FAIL", "none")).toBe(false);
  });

  it("allows UNKNOWN with severity none", () => {
    expect(isAllowedStatusSeverity("UNKNOWN", "none")).toBe(true);
  });
});
