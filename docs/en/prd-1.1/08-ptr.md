# 8. PTR

<!-- nav:start -->
[Concept](../01-concept.md) · [PRD 1.1 Contents](../03-prd-1.1.md) · [Русский](../../ru/prd-1.1/08-ptr.md)
<!-- nav:end -->

§8 defines the check of the receiving server's reverse names: what counts as a configured reverse name, how its confirmation is tested, and what does not follow from either.

## 8.1. What Is Being Checked

What is checked are the addresses of the hosts obtained from §6. Each address is asked for its reverse name, and each name for the address it points to.

## 8.2. A Confirmed Reverse Name

A reverse name counts as confirmed when the name obtained from an address resolves back to that same address. Such agreement is a long-standing requirement of host configuration: RFC 1912 requires forward and reverse records to be kept consistent and forbids pointing a reverse record at an alias.

An unconfirmed name means the address calls itself by a name that does not belong to it. That is a configuration error, not a sign of ill intent.

## 8.3. Addresses of Both Versions

Addresses of version four and version six are checked separately and give separate results.

The split is needed because a reverse zone for version six addresses is set up less often: a host with a configured reverse name for its version four address frequently has none for version six, and its owner does not know.

## 8.4. Results

| What was found | Status | Severity |
|---|---|---|
| a reverse name exists and is confirmed | `PASS` | — |
| a reverse name exists but is not confirmed | `FAIL` | `warning` |
| no reverse name for a version four address | `FAIL` | `warning` |
| no reverse name for a version six address | `FAIL` | `informational` |
| the reverse name points at an alias | `FAIL` | `informational` |

Several reverse names for one address are permitted and are reported as fact.

## 8.5. What Is Not Judged

The look of the name itself is not judged. A name that contains the address, or that resembles one handed out automatically, is not treated as a defect.

Such a judgement would be a guess: a name cannot establish how a host is configured or how receivers regard it, and a message saying so would read as a claim about the fate of mail. The general rule is 1.0 §13.

## 8.6. Technical Failure

| Cause | `reasonCode` |
|---|---|
| the reverse query did not complete | `ptr_lookup_failed` |
| the forward query for confirmation did not complete | `ptr_confirmation_incomplete` |

An incomplete confirmation gives `UNKNOWN`: without the forward answer we do not know whether the name is confirmed, and we are not entitled to call it unconfirmed.

## 8.7. What the Check Does Not Assert

- That the domain's mail will or will not land in spam: the reverse name of a receiving host does not describe the sending one and says nothing about the fate of outbound messages — §2.
- That the host is badly configured in general: a reverse name is one setting, not an assessment of a host.
- That the name belongs to the domain's owner: the addresses of a receiving host often belong to a mail provider.

## 8.8. Acceptance Criteria

- **AC-8.1** The addresses checked are those of the hosts obtained from §6; no other address is queried.
- **AC-8.2** A reverse name counts as confirmed only when it resolves back to the same address.
- **AC-8.3** Addresses of version four and version six give separate results.
- **AC-8.4** No reverse name for a version four address gives `FAIL` with severity `warning`, and for version six with severity `informational`.
- **AC-8.5** An unconfirmed reverse name gives `FAIL` with severity `warning`.
- **AC-8.6** The look of a reverse name affects no status and is not judged in the message.
- **AC-8.7** An incomplete confirmation gives `UNKNOWN` with a `reasonCode`, not a conclusion that the name is unconfirmed.
- **AC-8.8** The check's messages assert nothing about the fate of the domain's outbound mail.

---
