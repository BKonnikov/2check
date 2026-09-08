# 27. Deployment, Environments, and Release Management

<!-- nav:start -->
[Concept](../01-concept.md) · [PRD Contents](../02-prd.md) · [Русский](../../ru/prd/27-deployment-environments-release-management.md)
<!-- nav:end -->

§27 defines environment, release, and deployment requirements.

## 27.1. Environments

Logical model:

```text
development
test
staging
production
```

Production and non-production secrets and data stores are isolated.

## 27.2. Release Identifier

```text
applicationReleaseVersion
```

An equivalent immutable build identifier is permitted.

The following is maintained separately:

```text
configReleaseId
```

The release manifest allows reconstruction of the deployed combination:

- application release;
- storageSchemaVersion;
- health, security, orchestration, cache, module, and trust versions.

The manifest contains no secrets.

## 27.3. Release Promotion

Preferred order:

```text
build
→ automated tests
→ test
→ staging
→ quality gates
→ production
```

Where practical, the same immutable artifact is promoted from staging to production; environment differences are defined through configuration and secrets.

## 27.4. Migrations

Storage schema changes are explicit, versioned, and tested.

A migration may change data representation but not historical domain health semantics.

Before production release, the migration is identified as reversible or forward-only. A destructive migration requires a backup or an equivalent recovery strategy.

## 27.5. Deployment and Readiness

Normal deployment uses graceful draining and shutdown.

Before receiving traffic, a new instance confirms:

- valid configuration;
- valid security policy;
- a loaded trust store;
- a compatible, available mandatory scan store;
- a compatible storage schema.

An external provider outage does not necessarily block readiness.

## 27.6. Caching During Releases

Versioned compatibility is used instead of unconditional Redis flushing.

A change limited to health policy does not require flushing the technical cache.

A trust store change invalidates the compatibility of affected TLS results.

A security policy change requires reclassification of cached DNS candidates under current rules.

## 27.7. Rollback

Application, configuration, or trust store rollback is explicit and auditable.

Historical scans remain unchanged.

Rollback does not make stale or expired cache entries fresh.

## 27.8. Backup and Restore

The reusable result cache is not an authoritative backup target.

Sensitive-data backups comply with retention and security policies.

Restoring a historical ScanResult does not turn it into a fresh module cache entry.

## 27.9. Acceptance Criteria

- **AC-27.1** Environments are logically separated.
- **AC-27.2** The release artifact has an immutable identifier.
- **AC-27.3** Application release and configRelease are separate.
- **AC-27.4** Promotion to production passes the checks in §26.
- **AC-27.5** A migration does not recalculate historical domain health.
- **AC-27.6** Controlled graceful deployment is mandatory.
- **AC-27.7** Invalid security policy, trust data, or scan storage blocks readiness.
- **AC-27.8** Cache flushing is not the default release strategy.
- **AC-27.9** Rollback does not change historical scans.
- **AC-27.10** Lost execution is classified under §16.

---
