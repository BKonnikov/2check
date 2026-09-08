# 16. Scan Orchestration and Execution

<!-- nav:start -->
[Concept](../01-concept.md) · [PRD Contents](../02-prd.md) · [Русский](../../ru/prd/16-scan-orchestration-execution-model.md)
<!-- nav:end -->

§16 defines the scan lifecycle, ScanPlan, execution barriers, global deadline, and finalization.

## 16.1. Execution States

```text
PENDING | RUNNING | COMPLETED | FAILED
```

The MVP has no public CANCELLED state.

## 16.2. Scan Request — ScanRequest

```text
ScanRequest {
  input
  mode: FULL | PARTIAL
  selectedCategories?
  cacheMode: NORMAL | FORCE_REFRESH
}
```

Input preprocessing occurs before scan creation. Invalid input does not create a `scanId`.

## 16.3. Scan Plan — ScanPlan

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

Internal prerequisites do not expand visible scan scope or create hidden categories, scores, or issues.

## 16.4. Execution Context — ExecutionContext

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

The context is fixed for the entire scan. Mixing configurations within one scan is prohibited.

## 16.5. Parallelism and Dependencies

DNS and registration checks may run in parallel.

TLS depends on A/AAAA and security validation but does not wait for MX/TXT/NS/CNAME/SOA.

## 16.6. Address Resolution Barrier

All scheduled A/AAAA resolver operations reach a terminal transport or DNS outcome.

After the barrier, the following immutable set is formed:

```text
sealedDnsAddressCandidates
```

ALLOW is permitted only after the complete set is sealed. An early BLOCK is permitted when a forbidden candidate is found.

## 16.7. Global Deadline

An unfinished root check interrupted by the global deadline receives:

```text
UNKNOWN / scan_deadline_exceeded
```

A dependent check receives UNKNOWN with `blockedBy`.

If trustworthy terminal results are formed, the scan remains COMPLETED with `completionReason=DEADLINE_TERMINALIZED`.

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

The frontend does not perform authoritative finalization.

## 16.9. Scan Failure

FAILED applies only when a trustworthy terminal ScanResult cannot be formed.

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

`execution_state_unrecoverable` denotes a non-terminal scan whose execution was lost and cannot be resumed safely and deterministically.

## 16.10. Acceptance Criteria

- **AC-16.1** Invalid input does not create a scanId.
- **AC-16.2** ExecutionContext is fixed for the entire scan.
- **AC-16.3** A TLS-only PARTIAL scan may perform hidden DNS and security prerequisites without a visible DNS category.
- **AC-16.4** TLS does not start solely on an early quorum before the address resolution barrier.
- **AC-16.5** ALLOW requires a sealed, complete candidate set.
- **AC-16.6** The deadline may terminalize root checks as UNKNOWN without setting the scan to FAILED.
- **AC-16.7** Finalization is deterministic and performed by the backend.
- **AC-16.8** FAILED applies only when a trustworthy final result is impossible.
- **AC-16.9** Lost, unrecoverable execution receives `execution_state_unrecoverable`.

---
