# 10. Data Contracts and Exposure Levels

<!-- nav:start -->
[Concept](../01-concept.md) · [PRD 1.1 Contents](../03-prd-1.1.md) · [Русский](../../ru/prd-1.1/10-data-contracts.md)
<!-- nav:end -->

§10 defines the structures the `email` category uses inside the common contracts of 1.0, and which of its data reach which representation. The responsible section for the contracts themselves is 1.0 §6; only this category's variants are defined here.

## 10.1. The Category

The enumeration of categories gains one value:

```text
category: dns | registry | tls | email
```

The order they appear in the interface is set by 1.0 §23 and is not fixed in this section.

## 10.2. The Subject of a Check

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

`implicit` marks a host obtained from the domain's address records where there is no `MX` — §6.

## 10.3. Where a Result Came From

```text
EmailCheckSource =
  DnsRecordSource |
  SmtpProbeSource |
  BlocklistSource

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

BlocklistSource {
  kind: BLOCKLIST
  listsQueried
  listsAnswered
}
```

`listsQueried` and `listsAnswered` differ deliberately: a mismatch between them is exactly the state in which no hits does not mean "clean", and it has to be visible in the data rather than only in the text of a message — §9.

## 10.4. Exposure Levels

| Data | Representation |
|---|---|
| status, severity, message | Public |
| the policy and its key values | Public |
| the name the policy was found at | Public |
| `MX` hosts and their order of preference | Public |
| the name of a list holding a hit and the address of its page | Public |
| host addresses | Technical |
| the original text of records | Technical |
| the selector names queried | Technical |
| the domains of DMARC report recipients | Public |
| the full addresses of DMARC report recipients | Technical |

The split of the report addresses is deliberate. The recipient's domain answers a question worth asking — whether reports go to a third-party service — and the full address adds nothing to that, while turning a result page into a convenient source of addresses to harvest. The data are published in DNS and are not secret; the point is not to make collecting them easier than it needs to be.

The category defines no Gated data.

## 10.5. Machine Values

The list in 1.0 §6 gains, as values that are not localised:

- the names and values of policy tags;
- selector names;
- host names and their order of preference;
- the names of blocklists;
- the response codes of blocklists.

## 10.6. Acceptance Criteria

- **AC-10.1** The enumeration of categories gains the single value `email`.
- **AC-10.2** `EmailCheckTarget` and `EmailCheckSource` have the structure defined in this section and are not arbitrary fields.
- **AC-10.3** The name a policy was asked for is part of the subject of the check.
- **AC-10.4** A host obtained from the domain's address records is marked `implicit`.
- **AC-10.5** The number of lists queried and the number that answered are distinguished in the result data.
- **AC-10.6** Host addresses and the original text of records are not part of the Public representation.
- **AC-10.7** The full addresses of DMARC report recipients are not part of the Public representation; their domains are.
- **AC-10.8** The category defines no Gated data.

---
