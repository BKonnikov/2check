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
