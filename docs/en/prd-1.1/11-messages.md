# 11. Messages and Localization

<!-- nav:start -->
[Concept](../01-concept.md) · [PRD 1.1 Contents](../03-prd-1.1.md) · [Русский](../../ru/prd-1.1/11-messages.md)
<!-- nav:end -->

§11 defines what the messages of the `email` category tell the reader, and what they do not. The responsible section is 1.0 §13; the rules for the message model, the order of explanation and localization are not changed here.

## 11.1. What a Check Reports

The order in 1.0 §13 holds: what was measured, then the consequence, then the recommendation. Consequence and recommendation appear only for confirmed issues.

What is measured, in this category, is what was read in a record, not a restatement of what the record is for. "The sending policy permits everyone" is measured. "SPF protects against forged mail" is a definition, and the message of a particular check is not the place for it.

## 11.2. Forbidden Causal Claims

The list in 1.0 §13 gains the claims that may not be made in this category:

- an absent policy means the domain's mail lands in spam;
- a present policy means nobody can write in the domain's name;
- `p=reject` means forging mail is impossible;
- a key that was not found means the domain's mail is unsigned;
- a receiving host without a reverse name means trouble sending;
- `~all` means weak or incomplete protection.

Each of them sounds reasonable, and each connects what we observed to something we did not. They share one shape of error: a conclusion about the fate of messages is drawn from the state of a domain's records, while the fate of a message depends on the receiver, on the content and on the sending server, none of which we saw.

## 11.3. Wording for UNKNOWN

The rule in 1.0 §13 applies unchanged: `UNKNOWN` is described as "could not be checked", with no claim that the domain is faulty.

Two cases are explained plainly as a limitation of 2check rather than a property of the domain:

| Case | What is said |
|---|---|
| the DKIM selector is unknown | we do not know where to look for the key, and we list what was tried |
| outbound connections are unavailable | encryption cannot be checked in this deployment |

The message about an unknown selector offers to take one — the single place in the category where a reader can add to the check something that public data does not hold.

## 11.4. Wording for PASS

`PASS` does not become "everything is configured correctly" — 1.0 §13.

Two cases matter for this category. The "I accept no mail" record is described as a declared refusal of mail, not as a missing setting. A `p=quarantine` policy is described as in force, with no comparison to `p=reject`: the choice between them belongs to the owner and depends on how sure they are that their list of senders is complete.

## 11.5. Localization

The required languages are those of 1.0 §13: Russian, Uzbek and English. A missing translation remains a build error.

The Uzbek wording of this category is prepared the way 1.0's was, and does not hold back the release.

The known limitation stands and is written down here so it is not lost: the category introduces more terms than any other, and a translation that is formally correct while diverging from how the industry uses a term reads to a native speaker as a mistake. A reading by a native speaker remains a task for after the release.

## 11.6. Acceptance Criteria

- **AC-11.1** A check's message describes what was read in the records, not the purpose of the mechanism.
- **AC-11.2** The list of forbidden causal claims in §10.2 is enforced by the message configuration check.
- **AC-11.3** No message in the category asserts anything about the fate of a message.
- **AC-11.4** An unknown selector and unavailable outbound connections are explained as a limitation of 2check.
- **AC-11.5** The message about an unknown selector lists the names tried and offers to take a selector.
- **AC-11.6** The "I accept no mail" record is described as a declared refusal, not as a missing setting.
- **AC-11.7** `p=quarantine` is described as a policy in force, with no comparison to `p=reject`.
- **AC-11.8** Uzbek wording is present for every message in the category; its absence remains a build error.

---
