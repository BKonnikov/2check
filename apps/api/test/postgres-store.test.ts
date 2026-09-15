import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import EmbeddedPostgres from "embedded-postgres";
import type { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createPostgresScanStore } from "../src/scan/postgres-store.js";
import type { ScanRecord, ScanStore } from "../src/scan/store.js";
import { assertSchemaCompatible, migrate, STORAGE_SCHEMA_VERSION } from "../src/storage/migrate.js";
import { createPool } from "../src/storage/pool.js";

let postgres: EmbeddedPostgres;
let pool: Pool;
let store: ScanStore;
let dataDir: string;

beforeAll(async () => {
  dataDir = mkdtempSync(join(tmpdir(), "2check-pg-"));
  postgres = new EmbeddedPostgres({
    databaseDir: dataDir,
    user: "twocheck",
    password: "twocheck",
    port: 55433,
    persistent: false,
  });
  await postgres.initialise();
  await postgres.start();
  await postgres.createDatabase("twocheck");
  // The same pg Pool the server uses, so the tests exercise the production client.
  pool = createPool("postgres://twocheck:twocheck@127.0.0.1:55433/twocheck");
  await migrate(pool);
  store = createPostgresScanStore(pool);
}, 180_000);

afterAll(async () => {
  await pool?.end().catch(() => undefined);
  await postgres?.stop().catch(() => undefined);
  rmSync(dataDir, { recursive: true, force: true });
}, 60_000);

function record(scanId: string): ScanRecord {
  return {
    scanId,
    mode: "PARTIAL",
    cacheMode: "NORMAL",
    visibleCategories: ["dns"],
    canonicalDomain: {
      inputType: "HOSTNAME",
      unicodeHostname: "example.uz",
      asciiHostname: "example.uz",
      publicSuffix: "uz",
      publicSuffixType: "ICANN",
      registrableDomain: "example.uz",
      labels: ["example", "uz"],
      isIdn: false,
      hadTrailingDot: false,
    },
    executionContext: {
      healthPolicyVersion: "t",
      securityPolicyVersion: "t",
      orchestrationConfigVersion: "t",
      cacheContractVersion: "t",
      resolverSetVersion: "t",
      dnsModuleConfigVersion: "t",
      registryModuleConfigVersion: "t",
      tlsModuleConfigVersion: "t",
      trustStoreVersion: "t",
    },
    startedAt: "2026-09-15T00:00:00.000Z",
    executionState: "PENDING",
    categories: [],
  };
}

describe("PRD 27.4 — migrations", () => {
  it("records the schema version this build expects", async () => {
    await expect(assertSchemaCompatible(pool)).resolves.toBeUndefined();
    const result = await pool.query<{ version: number }>(
      "select max(version) as version from storage_schema",
    );
    expect(result.rows[0]?.version).toBe(STORAGE_SCHEMA_VERSION);
  });

  it("is idempotent", async () => {
    await expect(migrate(pool)).resolves.toEqual([]);
  });
});

describe("AC-19.4 — originalInput is not stored", () => {
  it("keeps the stored domain free of the raw input", async () => {
    const scan = record("11111111-1111-1111-1111-111111111111");
    await store.create(scan);
    const raw = await pool.query<{ canonical_domain: Record<string, unknown> }>(
      "select canonical_domain from scans where scan_id = $1",
      [scan.scanId],
    );
    expect(raw.rows[0]?.canonical_domain).not.toHaveProperty("originalInput");
    expect(raw.rows[0]?.canonical_domain.asciiHostname).toBe("example.uz");
  });
});

describe("AC-19.9 — the terminal snapshot is written whole", () => {
  it("round-trips a completed scan with its categories", async () => {
    const scan = record("22222222-2222-2222-2222-222222222222");
    await store.create(scan);

    scan.executionState = "RUNNING";
    await store.save(scan);

    scan.categories = [
      { category: "dns", status: "PASS", severity: "none", completeness: "COMPLETE", checks: [] },
    ];
    scan.sealedDnsAddressCandidates = ["93.184.216.34"];
    scan.securityValidation = {
      decision: "ALLOW",
      policyVersion: "t",
      checkedAddressCount: 1,
      blockedAddressCount: 0,
    };
    scan.executionState = "COMPLETED";
    scan.completedAt = "2026-09-15T00:00:05.000Z";
    await store.save(scan);

    const loaded = await store.get(scan.scanId);
    expect(loaded?.executionState).toBe("COMPLETED");
    expect(loaded?.categories[0]?.category).toBe("dns");
    expect(loaded?.sealedDnsAddressCandidates).toEqual(["93.184.216.34"]);
    expect(loaded?.securityValidation?.decision).toBe("ALLOW");
    expect(loaded?.completedAt).toBe("2026-09-15T00:00:05.000Z");
  });
});

describe("AC-19.2 and AC-19.3 — a terminal snapshot is immutable", () => {
  it("refuses a later write to a completed scan, in the database itself", async () => {
    const scan = record("33333333-3333-3333-3333-333333333333");
    await store.create(scan);
    scan.executionState = "COMPLETED";
    scan.completedAt = "2026-09-15T00:00:05.000Z";
    await store.save(scan);

    scan.categories = [
      {
        category: "dns",
        status: "FAIL",
        severity: "critical",
        completeness: "COMPLETE",
        checks: [],
      },
    ];
    await expect(store.save(scan)).rejects.toThrow(/finalized/i);

    const loaded = await store.get(scan.scanId);
    expect(loaded?.categories).toEqual([]);
  });

  it("refuses a raw UPDATE that bypasses the repository", async () => {
    await expect(
      pool.query("update scans set execution_state = 'FAILED' where scan_id = $1", [
        "33333333-3333-3333-3333-333333333333",
      ]),
    ).rejects.toThrow(/finalized/i);
  });

  it("does not restrict a scan that is still running", async () => {
    const scan = record("44444444-4444-4444-4444-444444444444");
    await store.create(scan);
    scan.executionState = "RUNNING";
    await expect(store.save(scan)).resolves.toBeUndefined();
    await expect(store.save(scan)).resolves.toBeUndefined();
  });
});

describe("unknown scans", () => {
  it("returns undefined rather than inventing a record", async () => {
    await expect(store.get("55555555-5555-5555-5555-555555555555")).resolves.toBeUndefined();
  });

  it("refuses to save a scan that was never created", async () => {
    await expect(store.save(record("66666666-6666-6666-6666-666666666666"))).rejects.toThrow(
      /Unknown scan/,
    );
  });
});
