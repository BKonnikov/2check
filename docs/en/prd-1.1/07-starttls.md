# 7. STARTTLS

<!-- nav:start -->
[Concept](../01-concept.md) · [PRD 1.1 Contents](../03-prd-1.1.md) · [Русский](../../ru/prd-1.1/07-starttls.md)
<!-- nav:end -->

[§7](07-starttls.md#7-starttls) defines the check of encryption at the receiving server: what the probe does, which hosts it touches, and how its result differs from a result we simply could not obtain.

## 7.1. What Is Being Checked

The check determines whether the receiving server offers STARTTLS and whether an encrypted connection can be established.

The release adds an SMTP probe to the existing DNS, registration, and TLS checks. SMTP connection admission is defined in [§13](13-outbound-security.md#13-outbound-connection-safety); destination-address validation is defined in [1.0 §15](../prd/15-security-ssrf.md#15-security-and-ssrf-protection).

## 7.2. What the Probe Does

A connection to port `25` of the host, a greeting, a request for extensions, the move to encryption, and the end of the session.

The probe sends no mail: the sender, recipient and data commands are not issued under any circumstances. From the receiving server's point of view this is a visit that leaves behind neither a message nor a deferred delivery.

The port is fixed. Arbitrary ports are accepted neither from input nor from the domain's records — [1.0 §25](../prd/25-privacy-data-protection-abuse-boundaries.md#25-privacy-access-and-abuse-prevention).

## 7.3. Which Hosts Are Probed

The hosts come from [§6](06-mx.md#6-mx), in order of preference. No more than four hosts are probed in one check.

The limit exists because each host is a separate connection and a separate handshake, while the scan's time budget is shared across all categories and is set by [1.0 §22](../prd/22-performance-resource-limits-nfr.md#22-performance-and-resource-limits). Hosts beyond the limit are listed as not probed; the result then covers only the hosts that were, and the message says so plainly.

## 7.4. Results

| What happened | Status | Severity |
|---|---|---|
| every probed host offers encryption and the move succeeds | `PASS` | — |
| some hosts offer no encryption | `FAIL` | `warning` |
| no host offers encryption | `FAIL` | `critical` |
| encryption is offered but the move fails | `FAIL` | `critical` |

An unsuccessful transition after STARTTLS is offered is assessed as `critical` when a failure at the target server is confirmed. A technical inability to complete the observation is handled separately under [§7.6](07-starttls.md#76-technical-failure).

## 7.5. The Host's Certificate

The certificate is examined under the rules of [1.0 §10](../prd/10-ssl-tls.md#10-ssltls-checks): validity period, name match, chain of trust.

A validity-period, name-match, or trust failure gives `FAIL` with severity `warning`. This level is an assessment rule of 2check. The certificate result cannot establish whether an individual sender will accept the connection or deliver a message.

The protocol version is assessed in the same place, under [1.0 §10](../prd/10-ssl-tls.md#10-ssltls-checks), and gets no separate rules here.

## 7.6. Technical Failure

| Cause | `reasonCode` |
|---|---|
| the connection was not established | `starttls_connect_failed` |
| the session broke off before a result | `starttls_session_incomplete` |
| outbound connections are unavailable in this deployment | `outbound_smtp_unavailable` |

An unavailable outbound mail port is a deployment limitation. It is shown separately from a confirmed fault at the receiving server and does not reduce the domain's score. This follows the rule in [1.0 §15](../prd/15-security-ssrf.md#15-security-and-ssrf-protection).

In all three cases the status is `UNKNOWN`.

## 7.7. What the Check Does Not Assert

- That the server will accept a message: the probe never reaches the point of sending one and cannot know.
- That the domain's correspondence is encrypted: what is encrypted is the leg up to the receiving server, not the message's whole journey.
- That senders actually use encryption: that is the sender's decision.

## 7.8. Acceptance Criteria

- **AC-7.1** The probe connects only to port `25` and only to hosts obtained from [§6](06-mx.md#6-mx).
- **AC-7.2** The probe issues no sender, recipient or data commands.
- **AC-7.3** No more than four hosts are probed in one check; those not probed are listed, and the result covers only the ones that were.
- **AC-7.4** No encryption on some hosts gives `FAIL` with severity `warning`; on all of them, `FAIL` with severity `critical`.
- **AC-7.5** Encryption offered but not completed gives `FAIL` with severity `critical`.
- **AC-7.6** Faults in the certificate give `FAIL` with severity `warning`.
- **AC-7.7** Unavailable outbound connections give `UNKNOWN` with `reasonCode = outbound_smtp_unavailable` and do not reduce the domain's numerical score.
- **AC-7.8** The check's messages do not assert that the server will or will not accept a message.

---
