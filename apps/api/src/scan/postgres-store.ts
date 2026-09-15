import type {
  CategoryResult,
  DomainHealthSummary,
  SecurityValidationResult,
  TlsExecutionMetadata,
} from "@2check/contracts";
import type { Pool } from "pg";
import { STORAGE_SCHEMA_VERSION } from "../storage/migrate.js";
import {
  isTerminal,
  type ScanRecord,
  type ScanStore,
  type StoredCanonicalDomain,
} from "./store.js";

interface ScanRow {
  readonly scan_id: string;
  readonly execution_state: ScanRecord["executionState"];
  readonly mode: ScanRecord["mode"];
  readonly visible_categories: string[];
  readonly canonical_domain: StoredCanonicalDomain;
  readonly execution_context: ScanRecord["executionContext"];
  readonly categories: CategoryResult[];
  readonly sealed_dns_candidates: string[] | null;
  readonly security_validation: SecurityValidationResult | null;
  readonly tls_execution_metadata: TlsExecutionMetadata | null;
  readonly summary: DomainHealthSummary | null;
  readonly failure: ScanRecord["failure"] | null;
  readonly started_at: Date;
  readonly completed_at: Date | null;
}

function toRecord(row: ScanRow): ScanRecord {
  return {
    scanId: row.scan_id,
    mode: row.mode,
    visibleCategories: row.visible_categories as ScanRecord["visibleCategories"],
    canonicalDomain: row.canonical_domain,
    executionContext: row.execution_context,
    startedAt: row.started_at.toISOString(),
    executionState: row.execution_state,
    categories: row.categories,
    ...(row.sealed_dns_candidates === null
      ? {}
      : { sealedDnsAddressCandidates: row.sealed_dns_candidates }),
    ...(row.security_validation === null ? {} : { securityValidation: row.security_validation }),
    ...(row.tls_execution_metadata === null
      ? {}
      : { tlsExecutionMetadata: row.tls_execution_metadata }),
    ...(row.summary === null ? {} : { summary: row.summary }),
    ...(row.completed_at === null ? {} : { completedAt: row.completed_at.toISOString() }),
    ...(row.failure === null || row.failure === undefined ? {} : { failure: row.failure }),
  };
}

/**
 * PRD 19.1 — the scan store, separate in purpose from the reusable cache.
 * Immutability of a terminal snapshot is enforced by a database trigger as well as here, so a
 * future code path cannot quietly rewrite history (AC-19.2, AC-19.3).
 */
export function createPostgresScanStore(pool: Pool): ScanStore {
  return {
    async create(record) {
      await pool.query(
        `insert into scans (
           scan_id, storage_schema_version, execution_state, mode, visible_categories,
           canonical_domain, execution_context, categories, started_at, finalized
         ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, false)`,
        [
          record.scanId,
          STORAGE_SCHEMA_VERSION,
          record.executionState,
          record.mode,
          record.visibleCategories,
          JSON.stringify(record.canonicalDomain),
          JSON.stringify(record.executionContext),
          JSON.stringify(record.categories),
          record.startedAt,
        ],
      );
    },

    async get(scanId) {
      const result = await pool.query<ScanRow>("select * from scans where scan_id = $1", [scanId]);
      const row = result.rows[0];
      return row === undefined ? undefined : toRecord(row);
    },

    async save(record) {
      // AC-19.9 — the whole snapshot lands in one statement, so a reader never sees a scan that is
      // COMPLETED but missing its categories.
      const result = await pool.query(
        `update scans set
           execution_state = $2,
           categories = $3,
           sealed_dns_candidates = $4,
           security_validation = $5,
           tls_execution_metadata = $6,
           summary = $7,
           failure = $8,
           completed_at = $9,
           finalized = $10
         where scan_id = $1`,
        [
          record.scanId,
          record.executionState,
          JSON.stringify(record.categories),
          record.sealedDnsAddressCandidates === undefined
            ? null
            : JSON.stringify(record.sealedDnsAddressCandidates),
          record.securityValidation === undefined
            ? null
            : JSON.stringify(record.securityValidation),
          record.tlsExecutionMetadata === undefined
            ? null
            : JSON.stringify(record.tlsExecutionMetadata),
          record.summary === undefined ? null : JSON.stringify(record.summary),
          record.failure === undefined ? null : JSON.stringify(record.failure),
          record.completedAt ?? null,
          isTerminal(record.executionState),
        ],
      );

      if (result.rowCount === 0) {
        throw new Error(`Unknown scan ${record.scanId}`);
      }
    },
  };
}
