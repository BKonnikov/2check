import { loadEnv } from "../config/env.js";
import { migrate } from "../storage/migrate.js";
import { createPool } from "../storage/pool.js";

const env = loadEnv();
const pool = createPool(env.DATABASE_URL);

migrate(pool)
  .then(async (applied) => {
    process.stdout.write(
      applied.length === 0
        ? "storage schema already up to date\n"
        : `applied migrations: ${applied.join(", ")}\n`,
    );
    await pool.end();
    process.exit(0);
  })
  .catch(async (error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    await pool.end().catch(() => undefined);
    process.exit(1);
  });
