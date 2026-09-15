import { buildApp } from "./app.js";
import { loadEnv } from "./config/env.js";
import { createPostgresScanStore } from "./scan/postgres-store.js";
import { assertSchemaCompatible } from "./storage/migrate.js";
import { createPool } from "./storage/pool.js";

const env = loadEnv();
const pool = createPool(env.DATABASE_URL);

const app = buildApp({
  env,
  store: createPostgresScanStore(pool),
  // PRD 27.5 — a new instance confirms the scan store before it receives traffic.
  probes: [
    {
      name: "scan-store",
      check: async () => {
        await assertSchemaCompatible(pool);
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
        await pool.end().catch(() => undefined);
        process.exit(0);
      },
      (error: unknown) => {
        app.log.error({ error }, "shutdown failed");
        process.exit(1);
      },
    );
  });
}

app.listen({ host: env.API_HOST, port: env.API_PORT }).catch((error: unknown) => {
  app.log.error({ error }, "startup failed");
  process.exit(1);
});
