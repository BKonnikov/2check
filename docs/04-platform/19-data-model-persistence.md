# 19. Data Model & Persistence

§19 является нормативным владельцем logical persistence/data classification/retention relationships.

## 19.1. Logical stores

```text
1. Scan Store
2. Reusable Cache
3. Sensitive / Gated Data Store
4. Operational Logs / Metrics
```

Physical implementation technology не фиксируется PRD.

## 19.2. Historical Scan

PENDING/RUNNING execution record mutable.

После COMPLETED/FAILED terminal snapshot immutable.

Новый refresh создаёт новый scanId и не изменяет historical snapshot.

## 19.3. Stored data

COMPLETED FULL snapshot сохраняет достаточно normalized data для:

- CheckResults;
- CategoryResults;
- Issues;
- Summary;
- ScoreBreakdown;
- executionContext;
- relevant technical audit metadata.

Historical result не пересчитывается current policy.

## 19.4. TLS execution metadata

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

Минимальный prerequisite audit subset: selected endpoints + dependencyFingerprint + securityPolicyVersion.

## 19.5. Freshness persistence

Persist source-of-truth `checkedAt`/`sourceUpdatedAt?` и provenance `cached`.

`cacheAge` может вычисляться на read.

## 19.6. originalInput

Не сохраняется в Scan Store по умолчанию. URL path/query/fragment/credentials не являются persisted Domain Health data.

## 19.7. Data classification

```text
PUBLIC_NORMALIZED
TECHNICAL_INTERNAL
GATED_SENSITIVE
OPERATIONAL_SECRET
```

Mapping к API:

- PUBLIC_NORMALIZED → Public;
- TECHNICAL_INTERNAL → может быть explicit Safe Technical Projection;
- GATED_SENSITIVE → Gated;
- OPERATIONAL_SECRET → no Web API projection.

`TECHNICAL_INTERNAL` не означает автоматически browser-visible и не означает автоматически backend-only.

## 19.8. Registry data

Public Scan Store содержит normalized non-sensitive Registry fields и registrant state only.

Actual registrant values/raw sensitive RDAP/WHOIS — separate sensitive boundary при необходимости.

## 19.9. Retention

Разные lifecycle для:

- ScanResult;
- reusable cache;
- gated PII;
- raw provider diagnostics;
- logs/metrics.

Exact durations owned by Data Retention/Security/Architecture policy.

Persistence scan resources не создаёт Domain History product feature.

Primary retrieval identity = `scanId`.

## 19.10. Integrity

COMPLETED publish only after atomic consistent terminal snapshot.

ScorePenalty.issueId ссылается на существующий Issue; Issue check references должны быть valid within same scan/category.

Storage representation versioned через `storageSchemaVersion`.

## 19.11. Acceptance Criteria

- **AC-19.1** Scan Store и Reusable Cache semantic roles разделены.
- **AC-19.2** Terminal snapshot immutable.
- **AC-19.3** Historical policy/score не пересчитываются.
- **AC-19.4** `originalInput` не persisted по умолчанию.
- **AC-19.5** Actual Registry PII separate gated storage boundary.
- **AC-19.6** TECHNICAL_INTERNAL visibility определяется allowlist projection.
- **AC-19.7** OPERATIONAL_SECRET никогда browser-facing.
- **AC-19.8** Persistence не создаёт implicit Domain History.
- **AC-19.9** Terminal commit atomic/consistent.
- **AC-19.10** Storage schema migration не меняет historical Health semantics.

---
