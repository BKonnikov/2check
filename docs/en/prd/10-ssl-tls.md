# 10. SSL/TLS Checks

<!-- nav:start -->
[Concept](../01-concept.md) · [PRD Contents](../02-prd.md) · [Русский](../../ru/prd/10-ssl-tls.md)
<!-- nav:end -->

§10 defines the technical semantics of TLS checks.

## 10.1. Endpoint Coverage

The MVP checks at most:

```text
1 representative IPv4
1 representative IPv6
```

`endpointCoverage = REPRESENTATIVE`.

An exhaustive scan of all serving backends is not performed.

## 10.2. Representative Endpoint Selection

Only security-validated addresses may be selected.

Selection order:

1. the highest resolver observation count;
2. a stable, deterministic tie-break.

## 10.3. Connection

- a TCP connection directly to the selected pinned IP address;
- port 443/TCP;
- SNI = `asciiHostname`;
- no independent implicit DNS resolution;
- no HTTP requests or content retrieval.

TLS fields in `CheckResult.target/source` use:

```text
TlsCheckTarget {
  kind: TLS_HOST
  hostname
  port: 443
  ipFamily?: IPV4 | IPV6
}

TlsCheckSource {
  kind: DIRECT_TLS_PROBE
  endpointCoverage: REPRESENTATIVE
}
```

`ipFamily` is used for family-specific connectivity checks and may be absent from aggregate certificate checks. Selected IP addresses and the dependency fingerprint belong to TLS execution metadata (§19) and are not duplicated in `TlsCheckSource`.

## 10.4. Protocol Support

The MVP checks TLS 1.2 and TLS 1.3. TLS 1.3 is preferred when supported.

## 10.5. Certificate Checks

- validity period;
- hostname match;
- issuer;
- SAN;
- validFrom / validTo;
- days remaining;
- certificate chain validation;
- expired intermediate certificates;
- a self-signed leaf certificate;
- an untrusted chain.

The MVP excludes cipher grading, legacy attack checks, OCSP/CRL, HSTS, HTTP/2, QUIC, CT grading, and TLS1.0/1.1 grading.

## 10.6. Hostname Matching

Only SAN is used. CN fallback is not supported.

A wildcard covers only one complete leftmost label.

## 10.7. IPv4/IPv6

Address families are processed independently after target-wide security validation.

An absent family receives N/A.

Aggregate certificate checks use `dependencyMode = ANY` between IPv4/IPv6 connectivity prerequisites. One successful path that yields a certificate is sufficient for evaluation. An absent family, N/A, failure, or UNKNOWN in the other family does not block evaluation of the available successful path; the other family's connectivity result is preserved separately.

If both families yield certificates, the aggregate evaluation considers both: an invalid certificate on either checked family produces FAIL for the relevant aggregate check. The `ANY` mode determines eligibility to begin evaluation but does not permit ignoring a second available certificate-bearing path.

If neither family provides a successful certificate-bearing path, the certificate check does not create an independent target failure. It receives a dependency-driven terminal result through `blockedBy` under §7/§18.

Different IPv4/IPv6 certificate fingerprints alone do not constitute FAIL.

## 10.8. Connectivity Outcome Classification

After the security decision ALLOW:

- a target TCP connection timeout or refusal → connectivity FAIL;
- a handshake timeout or failure after an actual target attempt → connectivity FAIL;
- a scanner or network infrastructure failure without a trustworthy target observation → UNKNOWN `internal_network_error`.

## 10.9. TLS Technical Reason Codes

The codes directly applicable to this module are:

```text
internal_network_error
scanner_tls_error
```

Security codes are defined in §15, orchestration codes in §16, and general rules in §18.

## 10.10. Acceptance Criteria

- **AC-10.1** At most one representative endpoint is checked per IP family.
- **AC-10.2** The TLS client does not resolve the hostname again.
- **AC-10.3** SNI uses asciiHostname.
- **AC-10.4** Hostname validation uses SAN only, without CN fallback.
- **AC-10.5** An absent address family receives N/A.
- **AC-10.6** Different valid certificate fingerprints between families are not FAIL.
- **AC-10.7** A target connection timeout after ALLOW is classified as FAIL, not UNKNOWN.
- **AC-10.8** An internal scanner network failure is classified as UNKNOWN/internal_network_error.
- **AC-10.9** Cipher grading, HTTP, HSTS, and OCSP are excluded from the MVP.
- **AC-10.10** TLS CheckResult uses the `TlsCheckTarget`/`TlsCheckSource` contract in §10.3.
- **AC-10.11** Aggregate certificate checks use `dependencyMode=ANY` between IPv4/IPv6 connectivity prerequisites: one successful certificate-bearing path permits evaluation, and all successful certificate-bearing paths contribute to the aggregate result.

---
