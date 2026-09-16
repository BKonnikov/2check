import Fastify, { type FastifyInstance } from "fastify";
import type { PublicStatsSource } from "./analytics/public-stats.js";
import { createEmptyPublicStats } from "./analytics/public-stats.js";
import type { AnalyticsStore } from "./analytics/store.js";
import { createInMemoryAnalyticsStore } from "./analytics/store.js";
import { createInMemoryCache, createSingleFlight } from "./cache/reusable-cache.js";
import type { Env } from "./config/env.js";
import { LOG_REDACTION, requestSerializer } from "./observability/logging.js";
import { createMetrics, type Metrics } from "./observability/metrics.js";
import { registerEventRoutes } from "./routes/events.js";
import { type ReadinessProbe, registerHealthRoutes } from "./routes/health.js";
import { registerScanRoutes } from "./routes/scans.js";
import { registerStatsRoutes } from "./routes/stats.js";
import { type AdmissionControl, createAdmissionControl } from "./scan/admission.js";
import type { ScanDependencies } from "./scan/orchestrator.js";
import { buildExecutionContext } from "./scan/orchestrator.js";
import { createInMemoryScanStore, type ScanStore } from "./scan/store.js";
import { STORAGE_SCHEMA_VERSION } from "./storage/migrate.js";

export interface AppOptions extends ScanDependencies {
  readonly env: Env;
  readonly probes?: readonly ReadinessProbe[];
  readonly store?: ScanStore;
  readonly metrics?: Metrics;
  /** PRD 22.2 — supply one to override the limits taken from configuration. */
  readonly admission?: AdmissionControl;
  /** PRD 27.5 — supply the storage compatibility check the instance should gate work on. */
  readonly canStoreResults?: () => Promise<void>;
  /** PRD 28 — product analytics. Absent means a private in-process store. */
  readonly analytics?: AnalyticsStore;
  /** PRD 28 — the published counters. Absent means the statistics page has nothing to show. */
  readonly stats?: PublicStatsSource;
}

export function buildApp({
  env,
  probes = [],
  store,
  metrics = createMetrics(),
  admission = createAdmissionControl({
    maxConcurrent: env.SCAN_MAX_CONCURRENT,
    perMinute: env.SCAN_RATE_LIMIT_PER_MINUTE,
  }),
  canStoreResults,
  analytics = createInMemoryAnalyticsStore(),
  stats = createEmptyPublicStats(),
  ...deps
}: AppOptions): FastifyInstance {
  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL,
      // PRD 21.3 — sensitive fields are censored by the logger itself, not per call site.
      redact: { paths: [...LOG_REDACTION.paths], censor: LOG_REDACTION.censor },
      serializers: { req: requestSerializer },
    },
    /**
     * PRD 22.2 — the rate limit is per caller, so the caller has to be identifiable. The service
     * binds to the loopback interface and is reachable only through the reverse proxy in front of
     * it (deploy/nginx.example.conf sets X-Forwarded-For), so the forwarded address is the only
     * one that means anything here; without this every visitor would share one bucket.
     * This governs request.ip alone: a user-controlled target still never reaches a network
     * client through the router (PRD 15).
     */
    trustProxy: true,
  });

  app.addHook("onSend", async (_request, reply, payload) => {
    // PRD 25.5 and AC-25.4 — a scan URL is a capability, so it must not travel in a referrer.
    reply.header("referrer-policy", "no-referrer");
    reply.header("x-content-type-options", "nosniff");
    reply.header("x-frame-options", "DENY");
    /**
     * PRD 25.4 — scan resources are never cached by shared infrastructure. The published
     * counters are the one exception: they are the same aggregate for every caller and carry
     * nothing about anybody, so the route that serves them sets its own header and keeps it.
     */
    if (reply.getHeader("cache-control") === undefined) {
      reply.header("cache-control", "no-store");
    }
    return payload;
  });

  registerHealthRoutes(app, env, probes, metrics, {
    storageSchemaVersion: STORAGE_SCHEMA_VERSION,
    executionContext: buildExecutionContext(env.SECURITY_INTERNAL_DENYLIST),
  });
  registerEventRoutes(app, { analytics, metrics });
  registerStatsRoutes(app, { stats });
  registerScanRoutes(app, {
    store: store ?? createInMemoryScanStore(),
    metrics,
    admission,
    scanDeadlineMs: env.SCAN_DEADLINE_MS,
    internalInfrastructureDenylist: env.SECURITY_INTERNAL_DENYLIST,
    ...(canStoreResults === undefined ? {} : { canStoreResults }),
    // One cache and one single-flight registry per process, so reuse and coalescing actually span
    // scans rather than being private to each one.
    cache: deps.cache ?? createInMemoryCache(),
    singleFlight: deps.singleFlight ?? createSingleFlight(),
    ...deps,
  });

  return app;
}
