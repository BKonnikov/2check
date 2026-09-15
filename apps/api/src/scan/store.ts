import type {
  CanonicalDomain,
  CategoryResult,
  ExecutionContext,
  ExecutionState,
  ScanCategory,
  ScanExecutionFailure,
  ScanMode,
  SecurityValidationResult,
} from "@2check/contracts";

/**
 * The internal record of one scan. It holds more than the browser ever sees: the full
 * CanonicalDomain including originalInput (PRD 19.6) and the security validation that TLS will
 * consume as an internal prerequisite (PRD 16.3).
 */
export interface ScanRecord {
  readonly scanId: string;
  readonly mode: ScanMode;
  readonly visibleCategories: readonly ScanCategory[];
  readonly canonicalDomain: CanonicalDomain;
  readonly executionContext: ExecutionContext;
  readonly startedAt: string;
  executionState: ExecutionState;
  categories: readonly CategoryResult[];
  sealedDnsAddressCandidates?: readonly string[];
  securityValidation?: SecurityValidationResult;
  completedAt?: string;
  failure?: ScanExecutionFailure;
}

export interface ScanStore {
  create(record: ScanRecord): void;
  get(scanId: string): ScanRecord | undefined;
}

/**
 * In-memory stand-in for the scan store of PRD 19. It is deliberately not the durable store:
 * historical scans, retention and storageSchemaVersion belong to PostgreSQL and are not here yet.
 */
export function createInMemoryScanStore(): ScanStore {
  const records = new Map<string, ScanRecord>();
  return {
    create(record) {
      records.set(record.scanId, record);
    },
    get(scanId) {
      return records.get(scanId);
    },
  };
}
