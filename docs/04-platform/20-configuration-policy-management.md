# 20. Configuration & Policy Management

§20 является нормативным владельцем configuration classes/versioning/activation rules.

## 20.1. Classes

```text
Health Policy
Technical Module Configuration
Security Policy
Orchestration Configuration
Cache Contract
Presentation / Message Configuration
Operational Configuration
Secrets
```

## 20.2. Versions

```text
healthPolicyVersion
securityPolicyVersion
orchestrationConfigVersion
cacheContractVersion
resolverSetVersion
dnsModuleConfigVersion
registryModuleConfigVersion
tlsModuleConfigVersion
trustStoreVersion
```

Optional grouping: `configReleaseId`.

`configReleaseId` не заменяет semantic component versions.

## 20.3. Version impact

- severity/Issue grouping/Score penalty → healthPolicyVersion;
- resolver set → resolverSetVersion;
- DNS evaluation semantics → dnsModuleConfigVersion;
- Registry adapter/parser/provider behavior → registryModuleConfigVersion;
- TLS scanner semantics → tlsModuleConfigVersion;
- trust anchors → trustStoreVersion;
- SSRF/internal denylist semantics → securityPolicyVersion;
- global deadline/orchestration behavior → orchestrationConfigVersion;
- generic cache serialization/compatibility → cacheContractVersion.

## 20.4. Health policy vs technical observations

Health-only policy change может reuse compatible technical observations.

Historical scans не пересчитываются.

## 20.5. Configuration immutability

Один version ID не обозначает разный content.

Semantic content change требует version change.

Optional deterministic content hash рекомендуется как integrity mechanism.

## 20.6. Activation

Candidate config:

```text
load
→ schema validation
→ cross-reference validation
→ semantic/security validation
→ atomic activation
```

Running scan продолжает frozen old configuration.

Invalid mandatory startup configuration → service not ready/fail-fast; hidden fallback запрещён.

## 20.7. Secrets

Secrets не входят в ScanResult/ExecutionContext/config content shown to browser.

Secret rotation без semantic behavior change не требует artificial module version bump.

## 20.8. Acceptance Criteria

- **AC-20.1** Configuration разделена по semantic classes.
- **AC-20.2** Semantic change меняет соответствующую version.
- **AC-20.3** Same version different content запрещён.
- **AC-20.4** Running scan использует frozen config snapshot.
- **AC-20.5** Activation atomic и предварительно validated.
- **AC-20.6** Unknown check references/cross-category Issue rules invalid config.
- **AC-20.7** User API не изменяет policy/quorum/trust/SSRF parameters.
- **AC-20.8** Canonical Registry technical configuration identifier = `registryModuleConfigVersion`.

---
