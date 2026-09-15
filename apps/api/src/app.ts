import Fastify, { type FastifyInstance } from "fastify";
import { createInMemoryCache, createSingleFlight } from "./cache/reusable-cache.js";
import type { Env } from "./config/env.js";
import { LOG_REDACTION, requestSerializer } from "./observability/logging.js";
import { createMetrics, type Metrics } from "./observability/metrics.js";
import { type ReadinessProbe, registerHealthRoutes } from "./routes/health.js";
import { registerScanRoutes } from "./routes/scans.js";
import type { ScanDependencies } from "./scan/orchestrator.js";
import { buildExecutionContext } from "./scan/orchestrator.js";
import { createInMemoryScanStore, type ScanStore } from "./scan/store.js";
import { STORAGE_SCHEMA_VERSION } from "./storage/migrate.js";

export interface AppOptions extends ScanDependencies {
  readonly env: Env;
  readonly probes?: readonly ReadinessProbe[];
  readonly store?: ScanStore;
  readonly metrics?: Metrics;
}

export function buildApp({
  env,
  probes = [],
  store,
  metrics = createMetrics(),
  ...deps
}: AppOptions): FastifyInstance {
  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL,
      // PRD 21.3 — sensitive fields are censored by the logger itself, not per call site.
      redact: { paths: [...LOG_REDACTION.paths], censor: LOG_REDACTION.censor },
      serializers: { req: requestSerializer },
    },
    // PRD 15 — a user-controlled target never reaches a network client through the router.
    trustProxy: false,
  });

  app.addHook("onSend", async (_request, reply, payload) => {
    // PRD 25.5 and AC-25.4 — a scan URL is a capability, so it must not travel in a referrer.
    reply.header("referrer-policy", "no-referrer");
    reply.header("x-content-type-options", "nosniff");
    reply.header("x-frame-options", "DENY");
    // PRD 25.4 — scan resources are never cached by shared infrastructure.
    reply.header("cache-control", "no-store");
    return payload;
  });

  registerHealthRoutes(app, env, probes, metrics, {
    storageSchemaVersion: STORAGE_SCHEMA_VERSION,
    executionContext: buildExecutionContext(),
  });
  registerScanRoutes(app, {
    store: store ?? createInMemoryScanStore(),
    metrics,
    // One cache and one single-flight registry per process, so reuse and coalescing actually span
    // scans rather than being private to each one.
    cache: deps.cache ?? createInMemoryCache(),
    singleFlight: deps.singleFlight ?? createSingleFlight(),
    ...deps,
  });

  return app;
}
