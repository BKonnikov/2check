# 19. Data Model and Persistence

<!-- nav:start -->
[Concept](../01-concept.md) · [PRD Contents](../02-prd.md) · [Русский](../../ru/prd/19-data-model-persistence.md)
<!-- nav:end -->

§19 defines logical persistence, data classification, and retention relationships.

## 19.1. Logical Stores

```text
1. Scan Store
2. Reusable Cache
3. Sensitive / Gated Data Store
4. Operational Logs / Metrics
```

The PRD does not prescribe a physical storage technology.

## 19.2. Historical Scans

A PENDING/RUNNING execution record is mutable.

After COMPLETED/FAILED, the terminal snapshot is immutable.

A new refresh creates a new scanId and does not modify the historical snapshot.

## 19.3. Stored Data

A COMPLETED FULL snapshot retains sufficient normalized data for:

- CheckResults;
- CategoryResults;
- Issues;
- Summary;
- ScoreBreakdown;
- executionContext;
- the relevant technical audit metadata.

A historical result is not recalculated under the current policy.

## 19.4. TLS Execution Metadata

Canonical structure:

```text
TlsExecutionMetadata {
  selectedIPv4?
  selectedIPv6?
  dependencyFingerprint
  securityPolicyVersion
  tlsModuleConfigVersion
  trustStoreVersion
  resultSource: FRESH | CACHE
}
```

The minimum prerequisite audit data comprises selected endpoints, dependencyFingerprint, and securityPolicyVersion.

## 19.5. Persisting Freshness Information

The authoritative `checkedAt`/`sourceUpdatedAt?` values and the provenance flag `cached` are retained.

`cacheAge` may be calculated on read.

## 19.6. Original Input — originalInput

It is not stored in the scan store by default. URL paths, queries, fragments, and credentials are not persisted domain health data.

## 19.7. Data Classification

```text
PUBLIC_NORMALIZED
TECHNICAL_INTERNAL
GATED_SENSITIVE
OPERATIONAL_SECRET
```

Mapping to API projections:

- PUBLIC_NORMALIZED → Public;
- TECHNICAL_INTERNAL → an explicitly permitted safe technical projection;
- GATED_SENSITIVE → Gated;
- OPERATIONAL_SECRET → no web API projection.

`TECHNICAL_INTERNAL` does not automatically imply either browser visibility or exclusively backend use.

## 19.8. Registration Data

The public scan store contains normalized non-sensitive registration fields and only the states of registrant fields.

Actual registrant values and sensitive raw RDAP/WHOIS data are stored within a separate protected boundary when needed.

## 19.9. Retention

Separate lifecycles apply to:

- ScanResult;
- reusable result caches;
- gated personal data;
- raw provider diagnostics;
- logs and metrics.

Exact durations are defined by data retention and security policies and architectural decisions.

Persisting scan resources does not introduce a user-facing domain history feature.

The primary result retrieval identifier is `scanId`.

## 19.10. Integrity

COMPLETED is published only after an atomic, consistent terminal snapshot is stored.

ScorePenalty.issueId references an existing Issue. Issue references to checks must be valid within the same scan and category.

The storage representation is versioned through `storageSchemaVersion`.

## 19.11. Acceptance Criteria

- **AC-19.1** The roles of the scan store and reusable result cache are distinct.
- **AC-19.2** The terminal snapshot is immutable.
- **AC-19.3** Historical policy and score are not recalculated.
- **AC-19.4** `originalInput` is not persisted by default.
- **AC-19.5** Actual registration PII is stored separately with gated access.
- **AC-19.6** TECHNICAL_INTERNAL visibility is determined by a projection allowlist.
- **AC-19.7** OPERATIONAL_SECRET is never exposed to the browser.
- **AC-19.8** Persistence does not implicitly introduce user-facing domain history.
- **AC-19.9** Terminal result storage is atomic and consistent.
- **AC-19.10** Storage schema migration does not change historical domain health semantics.

---
