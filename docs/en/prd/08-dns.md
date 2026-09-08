# 8. DNS Checks

<!-- nav:start -->
[Concept](../01-concept.md) · [PRD Contents](../02-prd.md) · [Русский](../../ru/prd/08-dns.md)
<!-- nav:end -->

§8 defines DNS check semantics.

## 8.1. Resolver Set

The default configured resolvers are:

```text
Google       8.8.8.8
Cloudflare   1.1.1.1
Yandex Basic 77.88.8.8
Quad9        9.9.9.10
```

Security-filtering variants are not used as default MVP resolvers.

## 8.2. Query Types

The following records are requested for the entered hostname:

```text
A, AAAA, MX, TXT, NS, CNAME, SOA
```

## 8.3. Provider Response

```text
DnsProviderResult {
  provider
  qname
  qtype
  transportStatus: SUCCESS | TIMEOUT | NETWORK_ERROR | PROTOCOL_ERROR
  rcode?: NOERROR | NXDOMAIN | SERVFAIL | REFUSED | FORMERR | NOTIMP | OTHER
  outcome?: ANSWER | NODATA | NXDOMAIN
  answers[]
  authority[]
  latencyMs?
  receivedAt
}
```

NXDOMAIN and NODATA are distinct outcomes.

DNS fields in `CheckResult.target/source` use the following module structures:

```text
DnsCheckTarget {
  kind: DNS_NAME
  qname
  qtype?: A | AAAA | MX | TXT | NS | CNAME | SOA
}

DnsCheckSource {
  kind: DNS_RESOLVER_SET
  resolverSetVersion
  providers[]
}
```

`qtype` is absent for checks of the name as a whole, such as `dns.name.existence`. The `providers[]` array contains stable configured resolver identifiers whose observations contributed to the check result. Detailed provider responses remain in DNS technical details and provider results.

TTL is displayed separately for each provider and is excluded from RRset equality comparisons.

## 8.4. Provider Record State

```text
PRESENT | ABSENT | NAME_NOT_FOUND | INDETERMINATE
```

The default minimum quorum is 2.

A strict majority of determinate provider states is required. A tie or insufficient determinate evidence produces `INDETERMINATE`.

## 8.5. Record State Resolution Checks

```text
dns.a.resolve
dns.aaaa.resolve
dns.mx.resolve
dns.txt.resolve
dns.ns.resolve
dns.cname.resolve
dns.soa.resolve
```

These checks establish whether a record's state could be determined, not whether the record is required to exist.

A determinate `PRESENT/ABSENT/NAME_NOT_FOUND` state yields PASS for the resolution check.

`INDETERMINATE` yields UNKNOWN.

## 8.6. Name Existence

The `dns.name.existence` check uses:

- EXISTS → PASS;
- a majority of NXDOMAIN/NOT_EXISTS → FAIL;
- an indeterminate result → UNKNOWN.

NXDOMAIN does not create repeated FAIL results for the absence of each record type.

## 8.7. Resolver Consistency

PRESENT conflicting with ABSENT/NXDOMAIN produces a FAIL with warning severity for a consistency issue.

For A/AAAA, different IP sets with records present produce an informational `valueVariation=true` flag, not FAIL.

MX/TXT/NS/CNAME/SOA mismatches are treated as warnings according to check policy.

## 8.8. Address Presence

The absence of AAAA is neutral and does not constitute FAIL by itself.

The absence of A when AAAA is present likewise does not constitute FAIL solely because A is absent.

An IPv6 TLS check receives N/A when AAAA is absent.

## 8.9. Security Candidate Set

The candidate set is the deduplicated union of all observed A/AAAA records from all resolver responses.

An IP address observed by a minority of resolvers is also subject to security validation.

Insufficient DNS consensus does not permit a TLS connection, even when individual IP addresses have been obtained.

## 8.10. Acceptance Criteria

- **AC-8.1** The default resolver set includes Google/Cloudflare/Yandex Basic/Quad9 Unfiltered.
- **AC-8.2** NXDOMAIN and NODATA are distinguished.
- **AC-8.3** The default quorum is 2.
- **AC-8.4** A tie or insufficient evidence produces INDETERMINATE.
- **AC-8.5** The absence of AAAA is not FAIL.
- **AC-8.6** A/AAAA value variation alone is not FAIL.
- **AC-8.7** The security candidate set includes all observed A/AAAA records.
- **AC-8.8** Insufficient resolver consensus does not permit a TLS network connection.
- **AC-8.9** A root NXDOMAIN problem is not counted repeatedly by record type.
- **AC-8.10** DNS CheckResult uses the `DnsCheckTarget`/`DnsCheckSource` contract in §8.3.

---
