import type {
  CanonicalDomain,
  CategoryResult,
  ExecutionContext,
  ExecutionState,
  ScanCategory,
  ScanExecutionFailure,
  ScanMode,
  SecurityValidationResult,
  TlsExecutionMetadata,
} from "@2check/contracts";

/**
 * PRD 19.6 and AC-19.4 — originalInput is not part of the stored domain. Dropping it from the
 * record itself makes that structural: no code path can persist it by accident.
 */
export type StoredCanonicalDomain = Omit<CanonicalDomain, "originalInput">;

export interface ScanRecord {
  readonly scanId: string;
  readonly mode: ScanMode;
  readonly visibleCategories: readonly ScanCategory[];
  readonly canonicalDomain: StoredCanonicalDomain;
  readonly executionContext: ExecutionContext;
  readonly startedAt: string;
  executionState: ExecutionState;
  categories: readonly CategoryResult[];
  sealedDnsAddressCandidates?: readonly string[];
  securityValidation?: SecurityValidationResult;
  tlsExecutionMetadata?: TlsExecutionMetadata;
  completedAt?: string;
  failure?: ScanExecutionFailure;
}

export function isTerminal(state: ExecutionState): boolean {
  return state === "COMPLETED" || state === "FAILED";
}

export interface ScanStore {
  create(record: ScanRecord): Promise<void>;
  get(scanId: string): Promise<ScanRecord | undefined>;
  /** PRD 19.10 and AC-19.9 — a terminal snapshot is written once, atomically, and never rewritten. */
  save(record: ScanRecord): Promise<void>;
}

/** Non-durable store for tests and for running without a database. */
export function createInMemoryScanStore(): ScanStore {
  const records = new Map<string, { record: ScanRecord; finalized: boolean }>();

  return {
    async create(record) {
      records.set(record.scanId, { record, finalized: false });
    },
    async get(scanId) {
      return records.get(scanId)?.record;
    },
    async save(record) {
      const existing = records.get(record.scanId);
      if (existing === undefined) {
        throw new Error(`Unknown scan ${record.scanId}`);
      }
      if (existing.finalized) {
        throw new Error(`Scan ${record.scanId} is finalized and its snapshot is immutable`);
      }
      records.set(record.scanId, {
        record,
        finalized: isTerminal(record.executionState),
      });
    },
  };
}
