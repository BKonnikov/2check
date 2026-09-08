# 22. Performance, Resource Limits & NFR

§22 является normative owner bounded resource/performance behavior, но exact result-affecting values принадлежат versioned config/module owners.

## 22.1. Bounded execution

Все externally influenced operations bounded по:

- concurrency;
- queue;
- timeout;
- retries;
- response size;
- candidate count processing;
- memory;
- sockets;
- storage payload.

## 22.2. Backpressure

При saturation используются bounded queue/rate limiting/429/503, а не unlimited concurrency.

Accepted scan не остаётся RUNNING бесконечно; global deadline mandatory.

## 22.3. Provider/network budgets

Один Scan Plan имеет bounded **logical per-scan operation budget**.

После cache/single-flight реальные calls учитываются как **physical shared-execution budget**.

Single-flight уменьшает physical calls, но не расширяет logical Scan Plan и не обходит admission/rate/global limits.

## 22.4. Parser/input limits

DNS/Registry/TLS parser inputs bounded.

Нельзя silently truncate semantic data, если это может изменить status/Security/Issue/Score/fingerprint.

Security candidate set не truncates: невозможность проверить весь set → INDETERMINATE fail-closed.

## 22.5. Graceful degradation

Independent module/provider failure не блокирует остальные modules автоматически.

Degradation не означает guessing/stale-as-fresh.

Security semantics не ослабляются под load.

## 22.6. Graceful shutdown/crash

Controlled shutdown:

1. not-ready;
2. stop accepting new scans;
3. bounded grace period;
4. complete/terminalize safely;
5. no corrupt snapshot.

Unrecoverable orphan after crash → FAILED `execution_state_unrecoverable`.

Exactly-once distributed resume не требуется MVP.

## 22.7. One-VPS constraint

MVP correctness deployable на одном VPS. Capacity exhaustion приводит к controlled backpressure, не semantic downgrade.

## 22.8. Acceptance Criteria

- **AC-22.1** Unlimited parallelism отсутствует.
- **AC-22.2** Global scan deadline mandatory.
- **AC-22.3** Operation timeouts bounded и module-owned.
- **AC-22.4** Logical/physical budgets разделены.
- **AC-22.5** Single-flight не обходит admission controls.
- **AC-22.6** Security candidate set не silently truncates.
- **AC-22.7** High load не уменьшает scan scope/security semantics скрыто.
- **AC-22.8** Graceful shutdown сохраняет terminal integrity.
- **AC-22.9** One VPS capacity limit обрабатывается backpressure.

---
