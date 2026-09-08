# 26. Testing and Release Criteria

<!-- nav:start -->
[Concept](../01-concept.md) · [PRD Contents](../02-prd.md) · [Русский](../../ru/prd/26-testing-quality-gates-acceptance-strategy.md)
<!-- nav:end -->

§26 defines release readiness verification.

## 26.1. Test Layers

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

## 26.2. Required Deterministic Coverage

- input, IDN, and PSL;
- DNS: ANSWER/NODATA/NXDOMAIN, quorum, ties, and value variation;
- `.uz` RDAP/WHOIS fixtures: registered and free domains, malformed responses, rate limits, and encodings;
- TLS: valid and expired certificates, hostname mismatch, self-signed and untrusted chains, expired intermediates, IPv4/IPv6, protocols, and timeouts;
- dependency propagation, including `dependencyMode=ANY` for aggregate TLS certificate checks over one and two address families;
- reasonCode/blockedBy invariants;
- SSRF: forbidden ranges, rebinding, and IP pinning;
- Issue deduplication and rejection of cross-category aggregation;
- score, confidence, and verdict;
- NORMAL/FORCE_REFRESH, single-flight, and cache compatibility;
- policy and configuration validation;
- API projections and access boundaries;
- persistence and crash recovery.

## 26.3. Retryability Contract Tests

Backend contract tests cover RETRYABLE/CONDITIONAL/NOT_RETRYABLE.

A frontend test must establish that no client-side reasonCode mapping exists. Controlled fixtures may supply a known reasonCode with deliberately different retryability; the client must follow the supplied retryability.

NOT_RETRYABLE does not display an immediate retry action; CONDITIONAL does not become an unconditional immediate retry.

## 26.4. Technical Projection Tests

TECHNICAL_INTERNAL requires:

- a positive case: an allowlisted field is present in `/details`;
- a negative case: a non-allowlisted field of the same storage class is absent.

## 26.5. Browser Compatibility Matrix

Mandatory browsers:

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

For evergreen browsers, the current and previous stable releases or release generations are tested where practically available.

Real Chromium, WebKit, and Gecko engines are required.

Yandex Browser is not considered automatically covered by Chrome tests.

Opera Desktop is an optional additional target.

## 26.6. Image Sharing Compatibility

When the native file-sharing API is available, the system share sheet is used. Otherwise, image saving must work. The absence of native sharing does not make a browser unsupported.

## 26.7. Failure Injection

The minimum scenarios are:

- a DNS timeout;
- registration timeouts, malformed responses, and encoding errors;
- Redis unavailability;
- scan store unavailability;
- a target TLS timeout;
- an internal network failure;
- a security validation error;
- the global deadline;
- a worker crash.

Lost RUNNING execution without safe resumption receives FAILED `execution_state_unrecoverable`.

## 26.8. Release Blockers

A release is blocked by:

- an SSRF bypass;
- personal data or secret leakage;
- incorrect PASS/FAIL/UNKNOWN semantics;
- a duplicate score penalty;
- a corrupt historical result;
- a broken FULL flow in a mandatory browser;
- a missing mandatory language without a safe fallback.

## 26.9. Acceptance Criteria

- **AC-26.1** Critical invariant checks are automated where feasible.
- **AC-26.2** Golden fixtures isolate correctness checks from public internet instability.
- **AC-26.3** Frontend retry behavior is tested against the backend projection, not a reasonCode table.
- **AC-26.4** The technical projection has positive and negative allowlist tests.
- **AC-26.5** The mandatory browser matrix is verified before production release.
- **AC-26.6** An SSRF or security regression blocks release.
- **AC-26.7** Result card tests prohibit personal data, scanId, URL, QR codes, and internal data.
- **AC-26.8** Load tests verify correctness under load, not only throughput.
- **AC-26.9** Dependency tests cover `dependencyMode=ANY`: one successful TLS family permits certificate evaluation, and both successful families contribute to the aggregate result.

---
