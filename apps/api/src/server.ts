import { buildApp } from "./app.js";
import { loadEnv } from "./config/env.js";

const env = loadEnv();
const app = buildApp({ env });

// PRD 27.5 — deployment stops accepting work and shuts down in an orderly way.
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    app.log.info({ signal }, "shutdown requested");
    app.close().then(
      () => process.exit(0),
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
