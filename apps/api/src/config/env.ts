import { isValidCidr } from "@2check/domain";
import { z } from "zod";

/**
 * PRD 20.6 — startup configuration is validated before the service can become ready.
 * A hidden fallback is not allowed, so connection targets carry no default.
 */
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "staging", "production"]).default("development"),
  API_HOST: z.string().min(1).default("127.0.0.1"),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  REDIS_URL: z.string().url(),
  DATABASE_URL: z.string().url(),
  APPLICATION_RELEASE_VERSION: z.string().min(1),
  // PRD 22.2 — the limits that keep one server from being exhausted by its own traffic.
  SCAN_DEADLINE_MS: z.coerce.number().int().min(1000).max(300_000).default(30_000),
  SCAN_MAX_CONCURRENT: z.coerce.number().int().min(1).max(64).default(4),
  SCAN_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().min(1).max(600).default(12),
  /**
   * PRD 15.10 and AC-15.7 — CIDRs this deployment must not probe, comma-separated.
   *
   * The intended use is the scanner's own neighbourhood: addresses it cannot observe truthfully
   * from where it stands, typically because the path from here to them is not the path a visitor
   * takes. Naming them produces an honest "could not check" instead of a confident verdict drawn
   * from a view nobody else shares. Empty by default, and a malformed entry stops startup rather
   * than silently widening what gets probed.
   */
  SECURITY_INTERNAL_DENYLIST: z
    .string()
    .default("")
    .transform((value) =>
      value
        .split(",")
        .map((entry) => entry.trim())
        .filter((entry) => entry !== ""),
    )
    .refine(
      (entries) => entries.every((entry) => isValidCidr(entry)),
      "each entry must be a CIDR such as 91.216.37.0/24 or 2001:db8::/32",
    ),
});

export type Env = Readonly<z.infer<typeof schema>>;

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigurationError";
  }
}

export function loadEnv(source: Record<string, string | undefined> = process.env): Env {
  const parsed = schema.safeParse(source);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
    throw new ConfigurationError(`Invalid startup configuration: ${details}`);
  }
  return Object.freeze(parsed.data);
}
