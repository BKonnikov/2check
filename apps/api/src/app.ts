import Fastify, { type FastifyInstance } from "fastify";
import type { Env } from "./config/env.js";
import { type ReadinessProbe, registerHealthRoutes } from "./routes/health.js";
import { registerScanRoutes } from "./routes/scans.js";
import type { DnsQuery } from "./scan/orchestrator.js";
import { createInMemoryScanStore, type ScanStore } from "./scan/store.js";

export interface AppOptions {
  readonly env: Env;
  readonly probes?: readonly ReadinessProbe[];
  readonly store?: ScanStore;
  /** Injectable so tests run against golden fixtures instead of the public internet (AC-26.2). */
  readonly dnsQuery?: DnsQuery;
}

export function buildApp({ env, probes = [], store, dnsQuery }: AppOptions): FastifyInstance {
  const app = Fastify({
    logger: { level: env.LOG_LEVEL },
    // PRD 15 — a user-controlled target never reaches a network client through the router.
    trustProxy: false,
  });

  registerHealthRoutes(app, env, probes);
  registerScanRoutes(app, {
    store: store ?? createInMemoryScanStore(),
    ...(dnsQuery === undefined ? {} : { dnsQuery }),
  });

  return app;
}
