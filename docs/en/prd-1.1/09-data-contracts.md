# 9. Data Contracts and Exposure Levels

<!-- nav:start -->
[Concept](../01-concept.md) · [PRD 1.1 Contents](../03-prd-1.1.md) · [Русский](../../ru/prd-1.1/09-data-contracts.md)
<!-- nav:end -->

[§9](09-data-contracts.md#9-data-contracts-and-exposure-levels) defines the structures the `email` category uses inside the common contracts of 1.0, and which of its data reach which representation. The responsible section for the contracts themselves is [1.0 §6](../prd/06-common-data-contracts-exposure.md#6-common-data-contracts-and-exposure-levels); only this category's variants are defined here.

## 9.1. The Category

The enumeration of categories gains one value:

```text
category: dns | registry | tls | email
```

The order they appear in the interface is set by [1.0 §23](../prd/23-frontend-ux-result-presentation.md#23-user-interface-and-result-presentation) and is not fixed in this section.

## 9.2. The Subject of a Check

```text
EmailCheckTarget =
  EmailPolicyTarget |
  MailHostTarget

EmailPolicyTarget {
  kind: EMAIL_POLICY
  policy: SPF | DMARC | DKIM
  queriedName
}

MailHostTarget {
  kind: MAIL_HOST
  hostname
  preference?
  ipFamily?: IPV4 | IPV6
  implicit?
}
```

`queriedName` is the name the policy was asked for. For DMARC that name may belong to a parent domain, and for DKIM it carries a selector, so it is part of the subject of the check rather than a detail: without it the result cannot be read.

`implicit` marks a host obtained from the domain's address records where there is no `MX` — [§6](06-mx.md#6-mx).

## 9.3. Where a Result Came From

```text
EmailCheckSource =
  DnsRecordSource |
  SmtpProbeSource

DnsRecordSource {
  kind: DNS_RECORD
  traversedNames?
  voidLookups?
}

SmtpProbeSource {
  kind: SMTP_PROBE
  hostsProbed
  hostsSkipped
}
```

`hostsProbed` and `hostsSkipped` separately represent probed and skipped hosts. Any skipped hosts indicate incomplete coverage. Equality or inequality of these counts does not itself determine completeness — [§7](07-starttls.md#7-starttls).

## 9.4. Exposure Levels

| Data | Representation |
|---|---|
| status, severity, message | Public |
| the policy and its key values | Public |
| the name the policy was found at | Public |
| `MX` hosts and their order of preference | Public |
| host addresses | Technical |
| the original text of records | Technical |
| the selector names queried | Technical |
| the domains of DMARC report recipients | Public |
| the full addresses of DMARC report recipients | Technical |

The recipient domain identifies whether reports are sent to a third-party service. The full address is available in the technical representation on explicit request. Omitting it from the public summary limits further distribution of addresses already published in DNS.

The category defines no Gated data.

## 9.5. Machine Values

The list in [1.0 §6](../prd/06-common-data-contracts-exposure.md#6-common-data-contracts-and-exposure-levels) gains, as values that are not localized:

- the names and values of policy tags;
- selector names;
- host names and their order of preference.

## 9.6. Acceptance Criteria

- **AC-9.1** The enumeration of categories gains the single value `email`.
- **AC-9.2** `EmailCheckTarget` and `EmailCheckSource` have the structure defined in this section and are not arbitrary fields.
- **AC-9.3** The name a policy was asked for is part of the subject of the check.
- **AC-9.4** A host obtained from the domain's address records is marked `implicit`.
- **AC-9.5** The number of hosts probed and the number left unprobed are distinguished in the result data.
- **AC-9.6** Host addresses and the original text of records are not part of the Public representation.
- **AC-9.7** The full addresses of DMARC report recipients are not part of the Public representation; their domains are.
- **AC-9.8** The category defines no Gated data.

---
