import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Pool } from "pg";

/** PRD 19.10 — the storage representation is versioned through storageSchemaVersion. */
export const STORAGE_SCHEMA_VERSION = 7;

/** Keeps two instances from migrating at the same time during a rolling deployment (PRD 27.5). */
const ADVISORY_LOCK_KEY = 2_744_301;

export function migrationsDirectory(): string {
  return join(dirname(fileURLToPath(import.meta.url)), "..", "..", "migrations");
}

async function appliedVersions(pool: Pool): Promise<Set<number>> {
  try {
    const result = await pool.query<{ version: number }>("select version from storage_schema");
    return new Set(result.rows.map((row) => row.version));
  } catch {
    // The very first migration creates storage_schema itself.
    return new Set();
  }
}

/**
 * PRD 27.4 — schema changes are explicit, versioned and verified. Each file runs inside its own
 * transaction, so a failing migration leaves no partial schema behind.
 */
export async function migrate(pool: Pool, directory = migrationsDirectory()): Promise<number[]> {
  const files = (await readdir(directory)).filter((name) => name.endsWith(".sql")).sort();
  const client = await pool.connect();
  const applied: number[] = [];

  try {
    await client.query("select pg_advisory_lock($1)", [ADVISORY_LOCK_KEY]);
    const already = await appliedVersions(pool);

    for (const file of files) {
      const version = Number.parseInt(file.slice(0, 4), 10);
      if (Number.isNaN(version)) {
        throw new Error(`Migration file name must start with a four-digit version: ${file}`);
      }
      if (already.has(version)) {
        continue;
      }

      const sql = await readFile(join(directory, file), "utf8");
      await client.query("begin");
      try {
        await client.query(sql);
        await client.query(
          "insert into storage_schema (version) values ($1) on conflict do nothing",
          [version],
        );
        await client.query("commit");
        applied.push(version);
      } catch (error) {
        await client.query("rollback");
        throw error;
      }
    }
  } finally {
    await client.query("select pg_advisory_unlock($1)", [ADVISORY_LOCK_KEY]).catch(() => undefined);
    client.release();
  }

  return applied;
}

/**
 * PRD 27.5 — a new instance confirms storage schema compatibility before it takes traffic.
 * A schema newer than this build is refused: it may hold a representation this code misreads.
 */
export async function assertSchemaCompatible(pool: Pool): Promise<void> {
  const result = await pool.query<{ version: number }>(
    "select coalesce(max(version), 0) as version from storage_schema",
  );
  const current = result.rows[0]?.version ?? 0;
  if (current !== STORAGE_SCHEMA_VERSION) {
    throw new Error(
      `Storage schema version ${current} does not match the ${STORAGE_SCHEMA_VERSION} this build expects`,
    );
  }
}
