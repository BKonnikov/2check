import { Redis } from "ioredis";
import { buildApp } from "./app.js";
import { createRedisCache } from "./cache/redis-cache.js";
import { loadEnv } from "./config/env.js";
import { createPostgresScanStore } from "./scan/postgres-store.js";
import { assertSchemaCompatible } from "./storage/migrate.js";
import { createPool } from "./storage/pool.js";

const env = loadEnv();
const pool = createPool(env.DATABASE_URL);
const redis = new Redis(env.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 2 });

const app = buildApp({
  env,
  store: createPostgresScanStore(pool),
  cache: createRedisCache(redis),
  // PRD 27.5 — the instance confirms its mandatory dependencies before it receives traffic.
  probes: [
    {
      name: "scan-store",
      check: async () => {
        await assertSchemaCompatible(pool);
      },
    },
    {
      // PRD 14.1 and AC-14.1 — Redis is a mandatory component of the MVP.
      name: "reusable-cache",
      check: async () => {
        await redis.ping();
      },
    },
  ],
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

redis.connect().catch((error: unknown) => {
  // A cache that is unreachable at startup must not stop the service from reporting readiness
  // honestly; the probe above is what withholds traffic.
  app.log.warn({ error }, "reusable cache is not reachable yet");
});

app.listen({ host: env.API_HOST, port: env.API_PORT }).catch((error: unknown) => {
  app.log.error({ error }, "startup failed");
  process.exit(1);
});
