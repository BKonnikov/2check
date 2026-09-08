# 16. Scan Orchestration & Execution Model

§16 является нормативным владельцем scan lifecycle, ScanPlan, barriers, deadline и finalization.

## 16.1. Execution states

```text
PENDING | RUNNING | COMPLETED | FAILED
```

No public CANCELLED in MVP.

## 16.2. ScanRequest

```text
ScanRequest {
  input
  mode: FULL | PARTIAL
  selectedCategories?
  cacheMode: NORMAL | FORCE_REFRESH
}
```

Input preprocessing выполняется до scan creation. Invalid input → no `scanId`.

## 16.3. ScanPlan

```text
ScanPlan {
  scanId
  mode
  visibleCategories[]
  scheduledChecks[]
  internalPrerequisites[]
  cacheMode
  executionContext
}
```

Internal prerequisites не расширяют visible scope и не создают hidden category/score/issues.

## 16.4. ExecutionContext

```text
ExecutionContext {
  healthPolicyVersion
  securityPolicyVersion
  orchestrationConfigVersion
  cacheContractVersion
  resolverSetVersion
  dnsModuleConfigVersion
  registryModuleConfigVersion
  tlsModuleConfigVersion
  trustStoreVersion
}
```

Frozen на весь scan. Hybrid config scan запрещён.

## 16.5. Parallelism/dependencies

DNS и Registry могут выполняться параллельно.

TLS зависит от A/AAAA + Security, но не ждёт MX/TXT/NS/CNAME/SOA.

## 16.6. Address Resolution Barrier

Все scheduled A/AAAA resolver operations достигают terminal transport/DNS outcome.

После barrier формируется immutable:

```text
sealedDnsAddressCandidates
```

Security ALLOW только после sealed full set. Early BLOCK разрешён при обнаружении forbidden candidate.

## 16.7. Global deadline

Unfinished root check, прерванный global deadline:

```text
UNKNOWN / scan_deadline_exceeded
```

Dependent check → UNKNOWN `blockedBy`.

Если trustworthy terminal results сформированы, scan остаётся COMPLETED с `completionReason=DEADLINE_TERMINALIZED`.

## 16.8. Finalization

Deterministic order:

```text
CheckResult[]
→ CategoryResult[]
→ Issues
→ Confidence
→ Verdict
→ Score
```

Frontend не выполняет authoritative finalization.

## 16.9. Scan failure

FAILED только если невозможно сформировать trustworthy terminal ScanResult.

```text
ScanExecutionFailure {
  failureCode:
    orchestration_error |
    execution_state_unrecoverable |
    result_integrity_error |
    configuration_incompatible |
    internal_platform_error
  occurredAt
}
```

`execution_state_unrecoverable` — orphaned non-terminal scan после lost execution, когда safe deterministic resume невозможен.

## 16.10. Acceptance Criteria

- **AC-16.1** Invalid input не создаёт scanId.
- **AC-16.2** ExecutionContext frozen на scan.
- **AC-16.3** TLS-only PARTIAL может выполнять hidden DNS/security prerequisites без visible DNS category.
- **AC-16.4** TLS не стартует только по early quorum до address barrier.
- **AC-16.5** Security ALLOW требует sealed candidate set.
- **AC-16.6** Deadline может terminalize root checks в UNKNOWN без Scan FAILED.
- **AC-16.7** Finalization deterministic и backend-owned.
- **AC-16.8** FAILED только при невозможности trustworthy final result.
- **AC-16.9** Orphaned unrecoverable execution → `execution_state_unrecoverable`.

---
