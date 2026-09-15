/**
 * Development inspector. Not product surface: it runs the modules that exist today against one
 * input and prints what they produce, so their behaviour can be looked at directly rather than
 * only through tests.
 */
import type { CheckResult, DnsProviderResult, DnsQType } from "@2check/contracts";
import {
  canonicalizeDomain,
  collectAddressCandidates,
  type DnsResolveDetails,
  evaluateNameExistence,
  evaluateResolveCheck,
  evaluateResolverConsistency,
  validateTarget,
} from "@2check/domain";
import {
  DEFAULT_QTYPES,
  DEFAULT_RESOLVER_SET_VERSION,
  DEFAULT_RESOLVERS,
  queryResolverSet,
} from "../dns/resolver-set.js";

const POLICY_VERSION = "dev-inspector";

function line(label: string, value: unknown): void {
  const printable = value === null ? "null" : value === undefined ? "—" : String(value);
  process.stdout.write(`  ${label.padEnd(22)}${printable}\n`);
}

function checkLine(check: CheckResult<DnsResolveDetails>, extra = ""): void {
  const severity = check.severity === "none" ? "" : ` ${check.severity}`;
  const reason = check.reasonCode === undefined ? "" : ` (${check.reasonCode})`;
  const state = check.details?.state ?? "";
  process.stdout.write(
    `  ${check.checkId.padEnd(24)}${(check.status + severity).padEnd(18)}${state.padEnd(16)}${extra}${reason}\n`,
  );
}

/** --address may be repeated to judge specific candidates instead of the resolved ones. */
function readOverrides(argv: readonly string[]): string[] {
  const overrides: string[] = [];
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--address") {
      const value = argv[index + 1];
      if (value !== undefined) {
        overrides.push(value);
      }
    }
  }
  return overrides;
}

function summarizeAnswers(results: readonly DnsProviderResult[], qtype: DnsQType): string {
  const values = new Set<string>();
  for (const result of results) {
    if (result.qtype === qtype) {
      for (const record of result.answers) {
        values.add(record.value);
      }
    }
  }
  const listed = [...values].slice(0, 3).join(", ");
  return values.size > 3 ? `${listed}, …` : listed;
}

async function main(): Promise<number> {
  const argv = process.argv.slice(2);
  const input = argv[0];
  if (input === undefined || input.length === 0 || input.startsWith("--")) {
    process.stderr.write("usage: pnpm inspect <domain-or-url> [--address <ip> ...]\n");
    return 2;
  }
  const overrides = readOverrides(argv);

  process.stdout.write(`\ninput: ${input}\n\nCanonicalDomain (PRD 5)\n`);
  const result = canonicalizeDomain(input);
  if (!result.ok) {
    line("rejected", result.code);
    process.stdout.write("\n");
    return 1;
  }

  const domain = result.domain;
  line("inputType", domain.inputType);
  line("asciiHostname", domain.asciiHostname);
  line("unicodeHostname", domain.unicodeHostname);
  line("publicSuffix", domain.publicSuffix);
  line("publicSuffixType", domain.publicSuffixType);
  line("registrableDomain", domain.registrableDomain);
  line("isIdn", domain.isIdn);

  process.stdout.write("\nDNS (PRD 8)\n");
  line("resolvers", DEFAULT_RESOLVERS.map((entry) => entry.provider).join(", "));
  const results = await queryResolverSet(domain.asciiHostname);
  const options = {
    qname: domain.asciiHostname,
    resolverSetVersion: DEFAULT_RESOLVER_SET_VERSION,
  };

  process.stdout.write("\n");
  checkLine(evaluateNameExistence(results, options));
  for (const qtype of DEFAULT_QTYPES) {
    const forType = results.filter((entry) => entry.qtype === qtype);
    checkLine(evaluateResolveCheck(qtype, forType, options), summarizeAnswers(forType, qtype));
  }
  process.stdout.write("\n");
  for (const qtype of DEFAULT_QTYPES) {
    const forType = results.filter((entry) => entry.qtype === qtype);
    const consistency = evaluateResolverConsistency(qtype, forType, options);
    if (consistency.status !== "PASS" || consistency.details?.valueVariation === true) {
      checkLine(consistency, `valueVariation=${String(consistency.details?.valueVariation)}`);
    }
  }

  process.stdout.write("\nSecurity Validation (PRD 15)\n");
  const candidates = overrides.length > 0 ? overrides : collectAddressCandidates(results);
  line("candidates", candidates.length > 0 ? candidates.join(", ") : "none observed");
  if (overrides.length > 0) {
    line("candidate source", "--address (observed set ignored)");
  }

  const validation = validateTarget(candidates, { policyVersion: POLICY_VERSION });
  line("decision", validation.decision);
  line("checkedAddresses", validation.checkedAddressCount);
  line("blockedAddresses", validation.blockedAddressCount);
  line("reasonCode", validation.reasonCode);
  process.stdout.write("\n");

  return validation.decision === "ALLOW" ? 0 : 1;
}

main().then(
  (code) => process.exit(code),
  (error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(2);
  },
);
