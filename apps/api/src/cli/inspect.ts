/**
 * Development inspector. Not product surface: it prints what the preprocessing and security
 * modules currently produce for one input, so their behaviour can be looked at directly.
 *
 * Name resolution here is a plain node:dns lookup. The DNS module of PRD 8 — resolver comparison,
 * quorum, disagreement — is a separate component and is not what this calls.
 */
import { Resolver } from "node:dns/promises";
import { canonicalizeDomain, validateTarget } from "@2check/domain";

const POLICY_VERSION = "dev-inspector";

function line(label: string, value: unknown): void {
  const printable = value === null ? "null" : value === undefined ? "—" : String(value);
  process.stdout.write(`  ${label.padEnd(22)}${printable}\n`);
}

async function resolveAddresses(hostname: string): Promise<{ addresses: string[]; note?: string }> {
  const resolver = new Resolver();
  const collected: string[] = [];
  const failures: string[] = [];

  for (const [family, resolve] of [
    ["A", () => resolver.resolve4(hostname)],
    ["AAAA", () => resolver.resolve6(hostname)],
  ] as const) {
    try {
      collected.push(...(await resolve()));
    } catch (error) {
      failures.push(`${family}: ${error instanceof Error ? error.message : "failed"}`);
    }
  }

  return collected.length > 0
    ? { addresses: collected }
    : { addresses: [], note: failures.join("; ") };
}

/** --address may be repeated to judge specific candidates instead of resolving the name. */
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
  line("labels", domain.labels.join(" · "));
  line("isIdn", domain.isIdn);
  line("hadTrailingDot", domain.hadTrailingDot);

  process.stdout.write("\nSecurity Validation (PRD 15)\n");
  const { addresses, note } =
    overrides.length > 0
      ? { addresses: overrides, note: "supplied with --address" }
      : await resolveAddresses(domain.asciiHostname);
  line("candidates", addresses.length > 0 ? addresses.join(", ") : `none (${note ?? "no answer"})`);
  if (overrides.length > 0) {
    line("candidate source", "--address (name not resolved)");
  }

  const validation = validateTarget(addresses, { policyVersion: POLICY_VERSION });
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
