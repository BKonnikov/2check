# 13. User Messages and Localization

<!-- nav:start -->
[Concept](../01-concept.md) · [PRD Contents](../02-prd.md) · [Русский](../../ru/prd/13-human-readable-messages-localization.md)
<!-- nav:end -->

§13 defines message content and localization rules.

## 13.1. Message Model

Only `MessageDescriptor` from §6 is used.

A check message answers: **what the individual check established**.

An issue message answers: **which problem was confirmed, why it matters, and what action is appropriate**.

An Issue message may differ from the primary check's message.

## 13.2. Explanation Order

```text
Fact → Impact → Recommendation
```

Impact and recommendations are included only when supported by evidence.

## 13.3. Wording for UNKNOWN

UNKNOWN is described as an inability to check or obtain data, without claiming that the target is faulty.

`provider_not_supported` is explicitly described as a limitation of 2check.

## 13.4. Wording for PASS

PASS is not automatically converted into a statement that everything is configured correctly.

For example, an AAAA resolution result with status PASS and state ABSENT is described as “AAAA not found.”

## 13.5. Unsupported Causal Claims

Unsupported statements are prohibited, for example:

- resolver disagreement means DNS propagation;
- an IPv6 connection failure is caused by a firewall;
- NXDOMAIN means that the domain is available for purchase;
- a registration lookup failure means that the domain is unregistered;
- an untrusted chain means that every browser rejects the certificate.

## 13.6. Localization

Mandatory languages:

```text
ru | uz | en
```

A missing mandatory translation is a build or configuration error.

Runtime fallback order: requested language → EN → a safe generic message.

A raw message code may be displayed only in the technical projection.

## 13.7. Acceptance Criteria

- **AC-13.1** MessageDescriptor is shared by Check/Issue/WebApiError.
- **AC-13.2** UNKNOWN wording does not assert a target defect.
- **AC-13.3** provider_not_supported is explained as a product limitation.
- **AC-13.4** PASS wording states a fact rather than offering generic reassurance.
- **AC-13.5** Unsupported causal claims are prohibited.
- **AC-13.6** RU/UZ/EN are mandatory.
- **AC-13.7** A missing translation blocks production configuration or build.
- **AC-13.8** Message parameters are structured, escaped, and contain no pre-rendered HTML.

---
