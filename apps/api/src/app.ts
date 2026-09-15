import Fastify, { type FastifyInstance } from "fastify";
import type { Env } from "./config/env.js";
import { type ReadinessProbe, registerHealthRoutes } from "./routes/health.js";
import { registerScanRoutes } from "./routes/scans.js";
import type { ScanDependencies } from "./scan/orchestrator.js";
import { createInMemoryScanStore, type ScanStore } from "./scan/store.js";

export interface AppOptions extends ScanDependencies {
  readonly env: Env;
  readonly probes?: readonly ReadinessProbe[];
  readonly store?: ScanStore;
}

export function buildApp({ env, probes = [], store, ...deps }: AppOptions): FastifyInstance {
  const app = Fastify({
    logger: { level: env.LOG_LEVEL },
    // PRD 15 — a user-controlled target never reaches a network client through the router.
    trustProxy: false,
  });

  registerHealthRoutes(app, env, probes);
  registerScanRoutes(app, { store: store ?? createInMemoryScanStore(), ...deps });

  return app;
}
