import type { AddressClass, SecurityValidationResult } from "@2check/contracts";
import ipaddr from "ipaddr.js";

type Subnet = [ipaddr.IPv4 | ipaddr.IPv6, number];

/**
 * PRD 15.4–15.5 — IANA special-purpose ranges are forbidden by default and the MVP defines no
 * allowance list. Declaration order is precedence: metadata addresses sit inside broader ranges
 * and must be recognized as metadata rather than as link-local or unique-local.
 */
const IPV4_RANGES: Record<string, Subnet[]> = {
  FORBIDDEN_METADATA: [
    [ipaddr.parse("169.254.169.254"), 32],
    [ipaddr.parse("100.100.100.200"), 32],
  ],
  FORBIDDEN_LOOPBACK: [[ipaddr.parse("127.0.0.0"), 8]],
  FORBIDDEN_PRIVATE: [
    [ipaddr.parse("10.0.0.0"), 8],
    [ipaddr.parse("172.16.0.0"), 12],
    [ipaddr.parse("192.168.0.0"), 16],
  ],
  FORBIDDEN_LINK_LOCAL: [[ipaddr.parse("169.254.0.0"), 16]],
  FORBIDDEN_SHARED: [[ipaddr.parse("100.64.0.0"), 10]],
  FORBIDDEN_MULTICAST: [[ipaddr.parse("224.0.0.0"), 4]],
  FORBIDDEN_SPECIAL: [
    [ipaddr.parse("0.0.0.0"), 8],
    [ipaddr.parse("192.0.0.0"), 24],
    [ipaddr.parse("192.0.2.0"), 24],
    [ipaddr.parse("192.88.99.0"), 24],
    [ipaddr.parse("198.18.0.0"), 15],
    [ipaddr.parse("198.51.100.0"), 24],
    [ipaddr.parse("203.0.113.0"), 24],
    [ipaddr.parse("240.0.0.0"), 4],
  ],
};

const IPV6_RANGES: Record<string, Subnet[]> = {
  FORBIDDEN_METADATA: [[ipaddr.parse("fd00:ec2::254"), 128]],
  FORBIDDEN_LOOPBACK: [[ipaddr.parse("::1"), 128]],
  FORBIDDEN_LINK_LOCAL: [[ipaddr.parse("fe80::"), 10]],
  FORBIDDEN_MULTICAST: [[ipaddr.parse("ff00::"), 8]],
  FORBIDDEN_PRIVATE: [[ipaddr.parse("fc00::"), 7]],
  FORBIDDEN_SPECIAL: [
    [ipaddr.parse("::"), 128],
    [ipaddr.parse("64:ff9b::"), 96],
    [ipaddr.parse("100::"), 64],
    [ipaddr.parse("2001::"), 32],
    [ipaddr.parse("2001:db8::"), 32],
    [ipaddr.parse("2002::"), 16],
  ],
};

export interface SecurityPolicy {
  readonly policyVersion: string;
  /** PRD 15.10 — deployment-specific CIDRs; changing the effective list changes securityPolicyVersion. */
  readonly internalInfrastructureDenylist?: readonly string[];
}

/**
 * PRD 15.4 — classify one address. An IPv4-mapped IPv6 address is judged by its embedded IPv4,
 * which is what stops ::ffff:127.0.0.1 from passing as a public IPv6 address.
 */
export function classifyAddress(address: string, policy: SecurityPolicy): AddressClass | null {
  let parsed: ipaddr.IPv4 | ipaddr.IPv6;
  try {
    parsed = ipaddr.parse(address);
  } catch {
    return null;
  }

  if (parsed.kind() === "ipv6") {
    const v6 = parsed as ipaddr.IPv6;
    if (v6.isIPv4MappedAddress()) {
      parsed = v6.toIPv4Address();
    }
  }

  for (const entry of policy.internalInfrastructureDenylist ?? []) {
    try {
      const [network, bits] = ipaddr.parseCIDR(entry);
      if (network.kind() === parsed.kind() && parsed.match(network, bits)) {
        return "FORBIDDEN_INTERNAL_INFRASTRUCTURE";
      }
    } catch {
      // A malformed denylist entry must not silently widen access; it is reported by config validation.
      return null;
    }
  }

  const table = parsed.kind() === "ipv4" ? IPV4_RANGES : IPV6_RANGES;
  for (const [addressClass, subnets] of Object.entries(table)) {
    for (const [network, bits] of subnets) {
      if (parsed.match(network, bits)) {
        return addressClass as AddressClass;
      }
    }
  }

  return "PUBLIC_ALLOWED";
}

/**
 * PRD 15.1–15.6 — validate the whole candidate set.
 * The set is never truncated first (AC-15.3), a single forbidden address blocks the target
 * (AC-15.1), and anything that cannot be proven safe blocks it too (AC-15.2).
 */
export function validateTarget(
  addresses: readonly string[],
  policy: SecurityPolicy,
): SecurityValidationResult {
  if (addresses.length === 0) {
    return {
      decision: "INDETERMINATE",
      policyVersion: policy.policyVersion,
      checkedAddressCount: 0,
      blockedAddressCount: 0,
      reasonCode: "security_validation_incomplete",
    };
  }

  const classes = addresses.map((address) => classifyAddress(address, policy));

  if (classes.some((addressClass) => addressClass === null)) {
    return {
      decision: "INDETERMINATE",
      policyVersion: policy.policyVersion,
      checkedAddressCount: addresses.length,
      blockedAddressCount: 0,
      reasonCode: "security_validation_incomplete",
    };
  }

  const blockedAddressCount = classes.filter(
    (addressClass) => addressClass !== "PUBLIC_ALLOWED",
  ).length;

  if (blockedAddressCount > 0) {
    return {
      decision: "BLOCK",
      policyVersion: policy.policyVersion,
      checkedAddressCount: addresses.length,
      blockedAddressCount,
      reasonCode: "ssrf_policy_block",
    };
  }

  return {
    decision: "ALLOW",
    policyVersion: policy.policyVersion,
    checkedAddressCount: addresses.length,
    blockedAddressCount: 0,
  };
}
