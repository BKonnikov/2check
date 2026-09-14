import Fastify, { type FastifyInstance } from "fastify";
import type { Env } from "./config/env.js";
import { type ReadinessProbe, registerHealthRoutes } from "./routes/health.js";

export interface AppOptions {
  readonly env: Env;
  readonly probes?: readonly ReadinessProbe[];
}

export function buildApp({ env, probes = [] }: AppOptions): FastifyInstance {
  const app = Fastify({
    logger: { level: env.LOG_LEVEL },
    // PRD 15 — a user-controlled target never reaches a network client through the router.
    trustProxy: false,
  });

  registerHealthRoutes(app, env, probes);

  return app;
}
