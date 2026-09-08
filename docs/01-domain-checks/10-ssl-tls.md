# 10. SSL/TLS

§10 является нормативным владельцем TLS technical semantics.

## 10.1. Endpoint coverage

MVP проверяет максимум:

```text
1 representative IPv4
1 representative IPv6
```

`endpointCoverage = REPRESENTATIVE`.

Не выполняется exhaustive backend scan.

## 10.2. Representative selection

Только Security-validated candidates.

Порядок выбора:

1. highest resolver observation count;
2. deterministic stable tie-break.

## 10.3. Connection

- TCP connect напрямую к pinned selected IP;
- port 443/TCP;
- SNI = `asciiHostname`;
- no own implicit DNS resolution;
- HTTP request/content не выполняется.

Для TLS `CheckResult.target/source` используются:

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

`ipFamily` используется для family-specific connectivity checks; для aggregate certificate checks поле может отсутствовать. Selected endpoint IPs и dependency fingerprint относятся к TLS execution metadata/details (§19), а не дублируются в `TlsCheckSource`.

## 10.4. Protocol support

MVP проверяет TLS 1.2 и TLS 1.3. Предпочтительно TLS 1.3, если поддерживается.

## 10.5. Certificate checks

- validity period;
- hostname match;
- issuer;
- SAN;
- validFrom / validTo;
- days remaining;
- chain validation;
- expired intermediate;
- self-signed leaf;
- untrusted chain.

Не входят: cipher grading, legacy attack suite, OCSP/CRL, HSTS, HTTP/2, QUIC, CT grading, TLS1.0/1.1 grading.

## 10.6. Hostname matching

SAN only. CN fallback отсутствует.

Wildcard покрывает только complete leftmost one label.

## 10.7. IPv4/IPv6

Families независимы после target-wide Security gate.

Missing family → N/A.

Aggregate certificate checks используют `dependencyMode = ANY` между family-specific IPv4/IPv6 connectivity prerequisites. Для запуска certificate evaluation достаточно минимум одного successful family path, на котором удалось получить certificate. Missing/N/A или failed/UNKNOWN другая family не блокирует evaluation доступного successful path и сохраняет собственный connectivity result отдельно.

Если обе families успешно дают certificate, aggregate certificate health учитывает обе: invalid на любой checked family → FAIL соответствующего aggregate certificate check. Таким образом `ANY` определяет eligibility запуска aggregate certificate check, но не разрешает игнорировать второй certificate-bearing path, если он также успешно доступен.

Если ни одна family не дала successful certificate-bearing path, certificate check не выполняется как самостоятельная target failure и получает dependency-driven terminal semantics через `blockedBy` согласно §7/§18.

Разные fingerprints IPv4/IPv6 не являются FAIL сами по себе.

## 10.8. Connectivity taxonomy

После Security ALLOW:

- target TCP connect timeout/refused → connectivity FAIL;
- target handshake timeout/failure после actual target attempt → connectivity FAIL;
- scanner/network infrastructure inability без trustworthy target observation → UNKNOWN `internal_network_error`.

## 10.9. TLS-specific reason codes

Module-specific directly applicable:

```text
internal_network_error
scanner_tls_error
```

Security codes принадлежат §15; orchestration codes — §16; generic rules — §18.

## 10.10. Acceptance Criteria

- **AC-10.1** Максимум один representative endpoint на IP family.
- **AC-10.2** TLS client не резолвит hostname повторно.
- **AC-10.3** SNI использует asciiHostname.
- **AC-10.4** SAN-only hostname validation без CN fallback.
- **AC-10.5** Missing family даёт N/A.
- **AC-10.6** Different valid fingerprints между families не являются FAIL.
- **AC-10.7** Target connectivity timeout после ALLOW классифицируется FAIL, не UNKNOWN.
- **AC-10.8** Internal scanner network failure классифицируется UNKNOWN/internal_network_error.
- **AC-10.9** Cipher grading/HTTP/HSTS/OCSP не входят в MVP.
- **AC-10.10** TLS CheckResult использует `TlsCheckTarget`/`TlsCheckSource` contract §10.3.
- **AC-10.11** Aggregate certificate checks используют `dependencyMode=ANY` между IPv4/IPv6 connectivity prerequisites: один successful certificate-bearing path достаточен для eligibility, а все successful certificate-bearing paths участвуют в aggregate evaluation.

---
