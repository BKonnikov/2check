# 27. Deployment, Environments & Release Management

§27 является normative owner environment/release/deployment guarantees.

## 27.1. Environments

Logical model:

```text
development
test
staging
production
```

Production/non-production secrets/data stores isolated.

## 27.2. Release identity

```text
applicationReleaseVersion
```

или equivalent immutable build ID.

Separate:

```text
configReleaseId
```

Release manifest позволяет восстановить deployed combination:

- application release;
- storageSchemaVersion;
- health/security/orchestration/cache/module/trust versions.

No secrets in manifest.

## 27.3. Promotion

Preferred:

```text
build
→ automated tests
→ test
→ staging
→ quality gates
→ production
```

Same immutable artifact promoted staging→production where practical; environment differences via config/secrets.

## 27.4. Migrations

Storage schema changes explicit/versioned/tested.

Migration может менять representation, но не historical Health semantics.

До production известно, reversible migration или forward-only; destructive migration требует backup/equivalent restore strategy.

## 27.5. Deployment/readiness

Normal deployment uses graceful drain/shutdown.

До traffic новая instance подтверждает:

- valid config;
- valid Security Policy;
- loaded trust store;
- compatible/available mandatory Scan Store;
- compatible storage schema.

External provider outage не обязательно blocks readiness.

## 27.6. Cache during releases

Versioned compatibility используется вместо unconditional Redis flush.

Health-only policy change не требует technical cache flush.

Trust store change invalidates affected TLS compatibility.

Security policy change requires current reclassification cached DNS candidates.

## 27.7. Rollback

Rollback application/config/trust store explicit and auditable.

Historical scans unchanged.

Rollback не делает stale/expired cache fresh.

## 27.8. Backup/restore

Reusable cache не authoritative backup target.

Sensitive-data backups соблюдают retention/security policy.

Restore historical ScanResult не превращает его в fresh module cache.

## 27.9. Acceptance Criteria

- **AC-27.1** Environments logically separated.
- **AC-27.2** Release artifact immutable identity.
- **AC-27.3** Application release и configRelease separate.
- **AC-27.4** Production promotion проходит §26 gates.
- **AC-27.5** Migration не пересчитывает historical Health.
- **AC-27.6** Controlled graceful deployment mandatory.
- **AC-27.7** Invalid Security/trust/Scan Store blocks readiness.
- **AC-27.8** Cache flush не default release strategy.
- **AC-27.9** Rollback не меняет historical scans.
- **AC-27.10** Orphan lost execution классифицируется согласно §16.

---
