# 14. Outbound Connection Safety

<!-- nav:start -->
[Concept](../01-concept.md) · [PRD 1.1 Contents](../03-prd-1.1.md) · [Русский](../../ru/prd-1.1/14-outbound-security.md)
<!-- nav:end -->

§14 defines the rules under which a connection to a mail host is permitted. The responsible section for address validation is 1.0 §15; its sequence, address classification and blocking rule are not changed here but extended to a new kind of connection.

## 14.1. Why This Needs a Section

Before this release the product made outbound connections of two kinds: queries to resolvers and HTTPS requests to the registry. Both go to fixed addresses set by configuration.

The encryption probe is built differently: it connects to a host whose name the domain under test supplied. This is the first time somebody else's record influences where we connect — and it is exactly the shape of thing 1.0 §15 exists to defend against.

## 14.2. The Sequence

The order in 1.0 §15 applies without exception:

```text
MailHostTarget
→ DNS A/AAAA
→ full candidate set
→ Security Validation
→ ALLOW | BLOCK | INDETERMINATE
→ selected validated endpoint
→ pinned connection
```

The host's full set of addresses is validated without prior truncation. If even one address is forbidden the whole host is blocked; dropping the forbidden address and connecting to the rest is not permitted — 1.0 §15.

The connection goes to the pinned address. The host name is not resolved again by the connection library.

## 14.3. What Is Held Fixed

| Constraint | Value |
|---|---|
| port | `25` only |
| source of host names | §6 only |
| session commands | the greeting, the request for extensions, the move to encryption, the close |
| hosts per check | no more than four — §7 |

The port is taken neither from the reader's input nor from the domain's records. An `MX` record holds a name and no port, and there is nowhere for one to come from — this row exists so that a future implementation does not "improve" the check with an arbitrary port.

The sender, recipient and data commands are never issued. The probe sends no mail and therefore cannot be used either to deliver messages or to test whether an address exists.

## 14.4. What This Rules Out

| Attempt | Why it fails |
|---|---|
| making the service connect to an internal address | a host's address is validated under 1.0 §15 like any other |
| swapping the address between validation and connection | the connection goes to the pinned address |
| using the service to scan ports | the port is fixed |
| using the service to amplify load | hosts come only from the records of the domain under test, and their number is bounded |
| sending mail through somebody else's hands | the data commands are never issued |

## 14.5. Our Own Infrastructure

The ban on reaching our own infrastructure — 1.0 §15 — extends to mail hosts unchanged.

Blocking for that reason gives `UNKNOWN` with an explanation that it is a limitation of the service, and does not reduce the domain's score. A check that calls our own network policy a defect of somebody's domain is wrong in both directions at once: it accuses the innocent and hides our own problem.

## 14.6. Time Budget

The probe is subject to the scan's shared budget in 1.0 §22. The category introduces no budget of its own.

The rule in §7 follows from that: hosts beyond the limit are listed as not probed rather than waiting for time to free up. A result obtained in part is reported as partial.

## 14.7. Acceptance Criteria

- **AC-14.1** A mail host's addresses pass the safety validation of 1.0 §15 as a full set, without truncation.
- **AC-14.2** A forbidden address blocks the whole host.
- **AC-14.3** The connection is made to the pinned address; re-resolving the name is not permitted.
- **AC-14.4** The connection port is `25` and cannot be set by input or by the domain's records.
- **AC-14.5** Host names come only from the result of §6.
- **AC-14.6** The session issues no sender, recipient or data commands.
- **AC-14.7** Blocking under the ban on our own infrastructure gives `UNKNOWN` and does not reduce the domain's score.
- **AC-14.8** The category introduces no time budget of its own.

---
