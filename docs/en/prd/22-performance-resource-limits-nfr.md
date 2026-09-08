# 22. Performance and Resource Limits

<!-- nav:start -->
[Concept](../01-concept.md) · [PRD Contents](../02-prd.md) · [Русский](../../ru/prd/22-performance-resource-limits-nfr.md)
<!-- nav:end -->

§22 defines resource bounds and behavior under load. Exact values that affect results belong to the versioned configuration of the relevant modules.

## 22.1. Bounded Execution

All externally influenced operations have bounds on:

- concurrency;
- queues;
- timeouts;
- retries;
- response size;
- candidate count processing;
- memory;
- sockets;
- stored payload size.

## 22.2. Backpressure

At saturation, bounded queues, rate limits, and 429/503 responses are used instead of unlimited concurrency.

An accepted scan cannot remain RUNNING indefinitely; a global deadline is mandatory.

## 22.3. Provider and Network Operation Budgets

Each scan plan has a bounded **logical per-scan operation budget**.

After cache and single-flight reuse, actual calls count against the **physical shared-execution budget**.

Single-flight reduces physical calls but does not expand the logical plan or bypass admission, rate, or global limits.

## 22.4. Input and Parser Limits

DNS, registration, and TLS parser inputs are bounded.

Semantic data must not be silently truncated if this could change status, security, Issues, score, or fingerprints.

The security candidate set is not truncated: inability to validate it in full produces INDETERMINATE and denies access.

## 22.5. Controlled Degradation

An independent module or provider failure does not automatically block other modules.

Degraded operation must not substitute guesses for results or present stale data as fresh.

Security rules are not weakened under load.

## 22.6. Graceful Shutdown and Crashes

Controlled shutdown order:

1. mark the service not ready;
2. stop accepting new scans;
3. allow a bounded completion period;
4. safely finish execution or produce terminal results;
5. prevent snapshot corruption.

Unrecoverable lost execution after a crash receives FAILED `execution_state_unrecoverable`.

Distributed resumption with exactly-once execution is not required in the MVP.

## 22.7. One-VPS Constraint

The MVP must operate correctly on one VPS. Resource exhaustion leads to controlled backpressure rather than altered result semantics.

## 22.8. Acceptance Criteria

- **AC-22.1** Unlimited parallelism is absent.
- **AC-22.2** A global scan deadline is mandatory.
- **AC-22.3** Operation timeouts are bounded and owned by the relevant module.
- **AC-22.4** Logical and physical budgets are distinct.
- **AC-22.5** Single-flight does not bypass admission controls.
- **AC-22.6** The security candidate set is not silently truncated.
- **AC-22.7** High load does not implicitly reduce scan scope or weaken security.
- **AC-22.8** Graceful shutdown preserves terminal result integrity.
- **AC-22.9** The resource limit of one VPS is handled through backpressure.

---
