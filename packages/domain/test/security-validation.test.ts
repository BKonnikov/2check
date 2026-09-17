import { describe, expect, it } from "vitest";
import { classifyAddress, validateTarget } from "../src/security-validation.js";

const POLICY = { policyVersion: "test-1" } as const;

describe("AC-15.4 and PRD 15.4 — address classification", () => {
  it.each([
    ["8.8.8.8", "PUBLIC_ALLOWED"],
    ["2a00:1450:4001:80f::200e", "PUBLIC_ALLOWED"],
    ["127.0.0.1", "FORBIDDEN_LOOPBACK"],
    ["::1", "FORBIDDEN_LOOPBACK"],
    ["10.1.2.3", "FORBIDDEN_PRIVATE"],
    ["172.16.0.1", "FORBIDDEN_PRIVATE"],
    ["192.168.1.1", "FORBIDDEN_PRIVATE"],
    ["fc00::1", "FORBIDDEN_PRIVATE"],
    ["169.254.1.1", "FORBIDDEN_LINK_LOCAL"],
    ["fe80::1", "FORBIDDEN_LINK_LOCAL"],
    ["100.64.0.1", "FORBIDDEN_SHARED"],
    ["224.0.0.1", "FORBIDDEN_MULTICAST"],
    ["ff02::1", "FORBIDDEN_MULTICAST"],
    ["0.0.0.0", "FORBIDDEN_SPECIAL"],
    ["198.18.0.1", "FORBIDDEN_SPECIAL"],
    ["203.0.113.5", "FORBIDDEN_SPECIAL"],
    ["255.255.255.255", "FORBIDDEN_SPECIAL"],
    ["2001:db8::1", "FORBIDDEN_SPECIAL"],
  ])("classifies %s as %s", (address, expected) => {
    expect(classifyAddress(address, POLICY)).toBe(expected);
  });

  it("recognizes cloud metadata before the broader range that contains it", () => {
    expect(classifyAddress("169.254.169.254", POLICY)).toBe("FORBIDDEN_METADATA");
    expect(classifyAddress("fd00:ec2::254", POLICY)).toBe("FORBIDDEN_METADATA");
  });

  it("judges an IPv4-mapped IPv6 address by its embedded IPv4", () => {
    expect(classifyAddress("::ffff:127.0.0.1", POLICY)).toBe("FORBIDDEN_LOOPBACK");
    expect(classifyAddress("::ffff:10.0.0.1", POLICY)).toBe("FORBIDDEN_PRIVATE");
    expect(classifyAddress("::ffff:8.8.8.8", POLICY)).toBe("PUBLIC_ALLOWED");
  });

  it("returns null for an address it cannot parse", () => {
    expect(classifyAddress("not-an-ip", POLICY)).toBeNull();
    expect(classifyAddress("1.2.3.4.5", POLICY)).toBeNull();
  });
});

describe("AC-15.7 — internal infrastructure denylist", () => {
  const policy = { policyVersion: "test-1", internalInfrastructureDenylist: ["203.0.55.0/24"] };

  it("blocks an otherwise public address that the deployment forbids", () => {
    expect(classifyAddress("203.0.55.7", policy)).toBe("FORBIDDEN_INTERNAL_INFRASTRUCTURE");
    expect(classifyAddress("203.0.56.7", policy)).toBe("PUBLIC_ALLOWED");
  });

  it("refuses to classify when a denylist entry is malformed rather than widening access", () => {
    expect(
      classifyAddress("8.8.8.8", {
        policyVersion: "x",
        internalInfrastructureDenylist: ["nonsense"],
      }),
    ).toBeNull();
  });
});

describe("AC-15.1 and AC-15.3 — the target is judged as a whole", () => {
  it("allows a target whose every candidate is public", () => {
    const result = validateTarget(["8.8.8.8", "1.1.1.1"], POLICY);
    expect(result.decision).toBe("ALLOW");
    expect(result.checkedAddressCount).toBe(2);
    expect(result.blockedAddressCount).toBe(0);
    expect(result.reasonCode).toBeUndefined();
  });

  it("blocks the whole target when one candidate is forbidden", () => {
    const result = validateTarget(["8.8.8.8", "127.0.0.1", "1.1.1.1"], POLICY);
    expect(result.decision).toBe("BLOCK");
    expect(result.reasonCode).toBe("ssrf_policy_block");
    expect(result.blockedAddressCount).toBe(1);
  });

  it("checks every candidate instead of stopping at the first forbidden one", () => {
    const result = validateTarget(["127.0.0.1", "10.0.0.1", "8.8.8.8"], POLICY);
    expect(result.checkedAddressCount).toBe(3);
    expect(result.blockedAddressCount).toBe(2);
  });

  it("carries the policy version that produced the decision", () => {
    expect(validateTarget(["8.8.8.8"], POLICY).policyVersion).toBe("test-1");
  });
});

describe("AC-15.2 — safety that cannot be proven blocks access", () => {
  it("is INDETERMINATE when the candidate set is empty", () => {
    const result = validateTarget([], POLICY);
    expect(result.decision).toBe("INDETERMINATE");
    expect(result.reasonCode).toBe("security_validation_incomplete");
  });

  it("is INDETERMINATE when any candidate cannot be classified", () => {
    const result = validateTarget(["8.8.8.8", "not-an-ip"], POLICY);
    expect(result.decision).toBe("INDETERMINATE");
    expect(result.reasonCode).toBe("security_validation_incomplete");
  });

  it("never reports ALLOW alongside a reason code", () => {
    const allowed = validateTarget(["8.8.8.8"], POLICY);
    expect(allowed.decision === "ALLOW" && allowed.reasonCode === undefined).toBe(true);
  });
});

/**
 * PRD 15.10 — the deployment's own addresses are blocked like any other forbidden range. What
 * differs is only what can honestly be said about the block, and the reason code is what carries
 * that difference through to the wording.
 */
describe("a block on the deployment's own infrastructure says so", () => {
  const policy = {
    policyVersion: "test-1",
    internalInfrastructureDenylist: ["91.216.37.0/24"],
  };

  it("names it as our own network rather than as a policy violation", () => {
    const result = validateTarget(["91.216.37.41"], policy);
    expect(result.decision).toBe("BLOCK");
    expect(result.reasonCode).toBe("own_infrastructure_not_observed");
  });

  it("is an ordinary policy block as soon as any other forbidden address is in the set", () => {
    // One private address among them is a finding about the domain, not about our network.
    const result = validateTarget(["91.216.37.41", "10.0.0.5"], policy);
    expect(result.decision).toBe("BLOCK");
    expect(result.reasonCode).toBe("ssrf_policy_block");
  });

  it("leaves an address outside the list to the ordinary rules", () => {
    expect(validateTarget(["93.184.216.34"], policy).decision).toBe("ALLOW");
    expect(validateTarget(["127.0.0.1"], policy).reasonCode).toBe("ssrf_policy_block");
  });
});
