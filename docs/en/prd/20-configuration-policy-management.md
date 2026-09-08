# 20. Configuration and Policy Management

<!-- nav:start -->
[Concept](../01-concept.md) · [PRD Contents](../02-prd.md) · [Русский](../../ru/prd/20-configuration-policy-management.md)
<!-- nav:end -->

§20 defines configuration classes, versioning, and activation rules.

## 20.1. Configuration Classes

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

Optional grouping uses `configReleaseId`.

`configReleaseId` does not replace component versions that identify semantic changes.

## 20.3. Version Impact

- severity, Issue grouping, or score penalties → healthPolicyVersion;
- the resolver set → resolverSetVersion;
- DNS evaluation rules → dnsModuleConfigVersion;
- registration adapter, parser, or provider behavior → registryModuleConfigVersion;
- TLS scanner semantics → tlsModuleConfigVersion;
- trust anchors → trustStoreVersion;
- SSRF or internal denylist semantics → securityPolicyVersion;
- the global deadline or orchestration behavior → orchestrationConfigVersion;
- general cache serialization or compatibility → cacheContractVersion.

## 20.4. Health Policy and Technical Observations

A change limited to health policy permits reuse of compatible technical observations.

Historical scans are not recalculated.

## 20.5. Configuration Immutability

One version identifier cannot represent different content.

A semantic content change requires a new version.

A deterministic content hash is recommended as an additional integrity mechanism.

## 20.6. Activation

A candidate configuration passes through the following stages:

```text
load
→ schema validation
→ cross-reference validation
→ semantic/security validation
→ atomic activation
```

A running scan continues with its fixed previous configuration.

Invalid mandatory startup configuration prevents readiness and requires fail-fast behavior; a hidden fallback configuration is prohibited.

## 20.7. Secrets

Secrets are excluded from ScanResult, ExecutionContext, and configuration content shown to the browser.

Secret rotation without a behavioral change does not require an artificial module version increase.

## 20.8. Acceptance Criteria

- **AC-20.1** Configuration is divided into semantic classes.
- **AC-20.2** A semantic change updates the corresponding version.
- **AC-20.3** Different content under one version is prohibited.
- **AC-20.4** A running scan uses a fixed configuration snapshot.
- **AC-20.5** Activation is atomic and preceded by validation.
- **AC-20.6** Unknown check references and cross-category Issue rules make a configuration invalid.
- **AC-20.7** The user API does not modify policy, quorum, trust anchors, or SSRF parameters.
- **AC-20.8** The canonical registration configuration identifier is `registryModuleConfigVersion`.

---
