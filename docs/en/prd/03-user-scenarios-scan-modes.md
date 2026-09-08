# 3. User Scenarios and Scan Modes

<!-- nav:start -->
[Concept](../01-concept.md) · [PRD Contents](../02-prd.md) · [Русский](../../ru/prd/03-user-scenarios-scan-modes.md)
<!-- nav:end -->

## 3.1. Default Flow

The primary action starts a scan with the following parameters:

```text
mode = FULL
cacheMode = NORMAL
```

FULL includes:

```text
DNS + Registry + TLS
```

## 3.2. Partial Scans — PARTIAL

Technical users may select a non-empty subset of categories:

```text
dns | registry | tls
```

Selecting all three categories requires `FULL`, not `PARTIAL`.

## 3.3. Tool Pages

```text
/dns-check → PARTIAL [dns]
/whois     → PARTIAL [registry]
/ssl-check → PARTIAL [tls]
```

Tool pages use the same backend modules and processing semantics as a FULL scan.

## 3.4. Global Summary

The global numerical score and verdict are available only for `FULL + FINAL`.

PARTIAL shows the selected category results without a global domain health score.

## 3.5. Acceptance Criteria

- **AC-3.1** The default flow creates a FULL scan with NORMAL cache mode.
- **AC-3.2** PARTIAL permits only a non-empty subset of FULL categories.
- **AC-3.3** Selecting DNS, registration, and TLS creates a FULL scan.
- **AC-3.4** Tool pages do not introduce separate technical processing semantics.
- **AC-3.5** PARTIAL receives neither a global numerical score nor a global verdict.

---
