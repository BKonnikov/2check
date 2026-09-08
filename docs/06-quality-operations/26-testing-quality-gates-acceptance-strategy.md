# 26. Testing, Quality Gates & Acceptance Strategy

§26 является normative owner release verification strategy.

## 26.1. Test layers

```text
Unit
Fixture / Golden
Contract
Integration
E2E
Security
Browser Compatibility
Accessibility / Localization
Failure Injection
Performance / Capacity
Privacy Leakage
```

## 26.2. Required deterministic coverage

- input/IDN/PSL;
- DNS ANSWER/NODATA/NXDOMAIN/quorum/tie/value variation;
- `.uz` RDAP/WHOIS registered/free/malformed/rate-limit/encoding fixtures;
- TLS valid/expired/mismatch/self-signed/untrusted/expired intermediate/IPv4/IPv6/protocol/timeouts;
- dependency propagation, включая `dependencyMode=ANY` для TLS aggregate certificate checks при single-family и dual-family paths;
- reasonCode/blockedBy invariants;
- SSRF forbidden ranges/rebinding/pinning;
- Issue dedupe/cross-category rejection;
- Score/confidence/verdict;
- NORMAL/FORCE_REFRESH/single-flight/cache compatibility;
- policy/config validation;
- API projections/access boundaries;
- persistence/crash recovery.

## 26.3. Retryability contract tests

Backend contract tests покрывают RETRYABLE/CONDITIONAL/NOT_RETRYABLE.

Frontend test должен доказывать отсутствие client-side reasonCode mapping. Controlled fixture может передать известный reasonCode с intentionally different retryability; frontend обязан следовать projected retryability.

NOT_RETRYABLE не показывает immediate Retry CTA; CONDITIONAL не становится unconditional immediate retry.

## 26.4. Technical projection tests

Для TECHNICAL_INTERNAL обязательны:

- positive case: allowlisted field присутствует `/details`;
- negative case: non-allowlisted field того же storage class отсутствует.

## 26.5. Browser compatibility matrix

Mandatory targets:

1. Google Chrome Desktop;
2. Google Chrome Android;
3. Apple Safari macOS;
4. Apple Safari iOS/iPadOS;
5. Microsoft Edge Desktop;
6. Mozilla Firefox Desktop;
7. Mozilla Firefox Android;
8. Yandex Browser Desktop;
9. Yandex Browser Android;
10. Samsung Internet Android.

Evergreen support target: current stable + previous stable/release generation, practically available.

Required real engines: Chromium, WebKit, Gecko.

Yandex Browser не считается автоматически покрытым Chrome tests.

Opera Desktop — optional additional target.

## 26.6. Share compatibility

Если native file share API доступен → Share Sheet. Если нет → working image-save fallback. Absence native share не делает browser unsupported.

## 26.7. Failure injection

Минимально:

- DNS timeout;
- Registry timeout/malformed/encoding;
- Redis unavailable;
- Scan Store unavailable;
- target TLS timeout;
- internal network error;
- Security validation error;
- global deadline;
- worker crash.

Orphan RUNNING + no safe resume → FAILED `execution_state_unrecoverable`.

## 26.8. Release blockers

Release blocks при:

- SSRF bypass;
- PII/secret leakage;
- wrong PASS/FAIL/UNKNOWN semantics;
- duplicate Score penalty;
- corrupt historical result;
- broken FULL flow в mandatory browser;
- mandatory locale missing without safe fallback.

## 26.9. Acceptance Criteria

- **AC-26.1** Critical invariants automated where feasible.
- **AC-26.2** Golden fixtures isolate correctness от public Internet flakiness.
- **AC-26.3** Retryability frontend behavior проверяется backend projection, не reasonCode table.
- **AC-26.4** Technical projection имеет positive/negative allowlist tests.
- **AC-26.5** Mandatory browser matrix проходит before production.
- **AC-26.6** SSRF/security regression blocks release.
- **AC-26.7** Share Card tests запрещают PII/scanId/URL/QR/internal data.
- **AC-26.8** Capacity tests проверяют correctness под load, не только throughput.
- **AC-26.9** Dependency tests покрывают `dependencyMode=ANY`: одна successful TLS family разрешает certificate evaluation, обе successful families участвуют в aggregate result.

---
