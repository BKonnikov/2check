# 5. DKIM

<!-- nav:start -->
[Concept](../01-concept.md) · [PRD 1.1 Contents](../03-prd-1.1.md) · [Русский](../../ru/prd-1.1/05-dkim.md)
<!-- nav:end -->

[§5](05-dkim.md#5-dkim) defines the DKIM check: where selectors come from, what is examined in a key that was found, and why a key that was not found is not the same as a key that is absent.

## 5.1. Why a Selector Cannot Be Discovered

A DKIM key is published at the name `<selector>._domainkey.<domain>`. The owner chooses the selector, and a domain's selectors cannot be enumerated through DNS: a name can only be queried by someone who already knows it.

An absent response at the queried names does not establish that no keys exist under other selectors. The result is limited to the names actually queried.

## 5.2. Where Selectors Come From

Two sources, in the order they are used:

1. A selector entered by the user. An optional field beside the domain.
2. The selectors of the mail provider recognized from the domain's `MX`.

The provider-to-selector mapping contains known candidates and is versioned configuration under the rules of [1.0 §20](../prd/20-configuration-policy-management.md#20-configuration-and-policy-management). Recognizing a receiving provider from `MX` supplies search candidates; it does not establish that outbound mail uses the same provider.

At most eight names from these sources are queried per check. Arbitrary selectors are not enumerated.

If no provider is recognized from `MX` and the user entered no selector, there is nothing to query.

## 5.3. Recognizing the Record

The record is read from the `TXT` of the selector's name. The responsible section for DNS queries is [1.0 §8](../prd/08-dns.md#8-dns-checks).

The `v` tag, when present, must have the value `DKIM1`. The key is held in the `p` tag.

## 5.4. What Is Examined in the Key

| What was found | Status | Severity |
|---|---|---|
| the key is usable | `PASS` | — |
| the `p` tag is empty | `FAIL` | `critical` |
| an `rsa` key shorter than `1024` bits | `FAIL` | `critical` |
| the `h` tag permits only `sha1` | `FAIL` | `critical` |
| the `t` tag contains `y` | `FAIL` | `warning` |

An empty `p` tag is a revoked key: the record is there, and signatures made under it verify against nothing.

The key length limit comes from RFC 8301, which updates RFC 6376: a verifier must not consider signatures valid when the key is shorter than `1024` bits. The ban on `sha1` comes from the same place: signatures using it have permanently failed evaluation.

A `t` tag containing `y` declares testing mode as described in [RFC 6376](https://www.rfc-editor.org/rfc/rfc6376.html#section-3.6.1). The check reports this mode and assigns the product-defined `warning` level.

`ed25519` keys are recognized alongside `rsa` under RFC 8463; the length limit does not apply to them.

## 5.5. When No Key Is Found

| What happened | Status | `reasonCode` |
|---|---|---|
| none of the names held a record | `UNKNOWN` | `dkim_selector_unknown` |
| the user entered a selector and it holds no record | `FAIL` | — |
| the query did not complete | `UNKNOWN` | `dkim_lookup_failed` |

An unsuccessful search using configured candidates gives an uncertain result. For an explicitly supplied selector, absence is established only at that name and gives `FAIL`. This finding does not extend to other selectors of the domain.

`UNKNOWN` reduces confidence in the result under the rules of [1.0 §11](../prd/11-domain-health-summary-issues.md#11-domain-health-summary-and-identified-issues). The check's message says plainly which names were tried and offers to take a selector.

## 5.6. What the Check Does Not Assert

- That the domain's mail is signed: publishing a key and signing messages are different acts, and the second cannot be checked through DNS.
- That the signature on a particular message is valid: without a message that is undefined.
- That the domain has no DKIM, when no key was found at the names tried.

## 5.7. Acceptance Criteria

- **AC-5.1** Selectors come from the value entered by the user and from the mapping for the provider recognized from `MX`; the mapping is versioned configuration.
- **AC-5.2** No more than eight selector names are queried in one check.
- **AC-5.3** An empty `p` tag gives `FAIL` with severity `critical`.
- **AC-5.4** An `rsa` key shorter than `1024` bits gives `FAIL` with severity `critical`.
- **AC-5.5** An `h` tag permitting only `sha1` gives `FAIL` with severity `critical`.
- **AC-5.6** A `t` tag holding `y` gives `FAIL` with severity `warning`.
- **AC-5.7** `ed25519` keys are recognized as valid; the length limit does not apply to them.
- **AC-5.8** No record at the names tried gives `UNKNOWN` with a `reasonCode`, not `FAIL`.
- **AC-5.9** No record at a selector entered by the user gives `FAIL`.
- **AC-5.10** The check's message names the selectors tried and does not assert that the domain has no DKIM.

---
