import { Redis } from "ioredis";
import { createPostgresAnalyticsStore } from "./analytics/store.js";
import { buildApp } from "./app.js";
import { createRedisCache } from "./cache/redis-cache.js";
import { loadEnv } from "./config/env.js";
import { createPostgresScanStore } from "./scan/postgres-store.js";
import { assertSchemaCompatible } from "./storage/migrate.js";
import { createPool } from "./storage/pool.js";

const env = loadEnv();
const pool = createPool(env.DATABASE_URL);
const redis = new Redis(env.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 2 });

const store = createPostgresScanStore(pool);

/**
 * PRD 27.5 — the same compatibility check the readiness probe runs, memoised so that gating every
 * POST on it costs one query every few seconds rather than one per request. An instance whose
 * storage this build cannot write must refuse work: accepting a scan it can never finish leaves
 * the reader polling a result that will never arrive.
 */
const SCHEMA_CHECK_TTL_MS = 5_000;
let schemaCheckedAt = 0;
let schemaCheck: Promise<void> | undefined;

function canStoreResults(): Promise<void> {
  const now = Date.now();
  if (schemaCheck === undefined || now - schemaCheckedAt > SCHEMA_CHECK_TTL_MS) {
    schemaCheckedAt = now;
    schemaCheck = assertSchemaCompatible(pool);
    schemaCheck.catch(() => undefined);
  }
  return schemaCheck;
}

const app = buildApp({
  env,
  store,
  canStoreResults,
  analytics: createPostgresAnalyticsStore(pool),
  cache: createRedisCache(redis),
  // PRD 27.5 — the instance confirms its mandatory dependencies before it receives traffic.
  probes: [
    {
      name: "scan-store",
      required: true,
      check: async () => {
        await assertSchemaCompatible(pool);
      },
    },
    {
      // PRD 21.6 and AC-21.5 — an unavailable Redis is a degraded state, not an unready
      // instance: the safe bypass keeps results correct, only slower.
      name: "reusable-cache",
      required: false,
      check: async () => {
        await redis.ping();
      },
    },
  ],
});

/**
 * PRD 21.6 — an unavailable cache is a degraded state, not a crash.
 * ioredis emits "error" on every failed reconnection attempt, and an unhandled error event
 * terminates the process, which would take the whole instance down exactly when the PRD requires
 * it to keep serving. The readiness probe is what reports the degradation.
 */
redis.on("error", (error: unknown) => {
  app.log.warn({ error: error instanceof Error ? error.message : error }, "reusable cache error");
});

// PRD 27.5 — deployment stops accepting work and shuts down in an orderly way.
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    app.log.info({ signal }, "shutdown requested");
    app.close().then(
      async () => {
        await Promise.allSettled([pool.end(), redis.quit()]);
        process.exit(0);
      },
      (error: unknown) => {
        app.log.error({ error }, "shutdown failed");
        process.exit(1);
      },
    );
  });
}

/**
 * AC-16.9 — a scan whose process died mid-execution would otherwise stay RUNNING for ever, and a
 * client polling it would wait for ever with it. The next start closes them with
 * execution_state_unrecoverable, which is the honest terminal state for a result nobody can
 * produce any more.
 */
store.recoverInterrupted().then(
  (closed) => {
    if (closed > 0) {
      app.log.warn({ closed }, "closed scans left running by a previous process");
    }
  },
  (error: unknown) => {
    app.log.error({ error }, "could not recover interrupted scans");
  },
);

redis.connect().catch((error: unknown) => {
  // A cache that is unreachable at startup must not stop the service from reporting readiness
  // honestly; the probe above is what withholds traffic.
  app.log.warn({ error }, "reusable cache is not reachable yet");
});

app.listen({ host: env.API_HOST, port: env.API_PORT }).catch((error: unknown) => {
  app.log.error({ error }, "startup failed");
  process.exit(1);
});
