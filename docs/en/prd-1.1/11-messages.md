# 11. Messages and Localization

<!-- nav:start -->
[Concept](../01-concept.md) · [PRD 1.1 Contents](../03-prd-1.1.md) · [Русский](../../ru/prd-1.1/11-messages.md)
<!-- nav:end -->

[§11](11-messages.md#11-messages-and-localization) defines what the messages of the `email` category tell the user, and what they do not. The responsible section is [1.0 §13](../prd/13-human-readable-messages-localization.md#13-user-messages-and-localization); the rules for the message model, the order of explanation and localization are not changed here.

## 11.1. What a Check Reports

The order in [1.0 §13](../prd/13-human-readable-messages-localization.md#13-user-messages-and-localization) is retained: observation, consequence, recommendation. A consequence and a recommendation for correcting a defect are included only for a confirmed issue.

The message describes a specific observation: a record found, its value, or a connection result. A definition of SPF, DMARC, or DKIM does not replace the check result.

## 11.2. Forbidden Causal Claims

The list in [1.0 §13](../prd/13-human-readable-messages-localization.md#13-user-messages-and-localization) gains the claims that may not be made in this category:

- an absent policy means the domain's mail lands in spam;
- a present policy means nobody can write in the domain's name;
- `p=reject` means forging mail is impossible;
- a key that was not found means the domain's mail is unsigned;
- a receiving host without a reverse name means trouble sending;
- `~all` means weak or incomplete protection.

These claims exceed the observation. DNS record state alone does not establish message handling, which also depends on the sending server, content, and receiver policy.

## 11.3. Wording for UNKNOWN

The rule in [1.0 §13](../prd/13-human-readable-messages-localization.md#13-user-messages-and-localization) applies unchanged: `UNKNOWN` is described as "could not be checked", with no claim that the domain is faulty.

Two cases are explained plainly as a limitation of 2check rather than a property of the domain:

| Case | What is said |
|---|---|
| the DKIM selector is unknown | we do not know where to look for the key, and we list what was tried |
| outbound connections are unavailable | encryption cannot be checked in this deployment |

The unknown-selector message offers the user a field to refine the search.

## 11.4. Wording for PASS

`PASS` does not become "everything is configured correctly" — [1.0 §13](../prd/13-human-readable-messages-localization.md#13-user-messages-and-localization).

Two cases matter for this category. The "I accept no mail" record is described as a declared refusal of mail, not as a missing setting. A `p=quarantine` policy is described as in force, with no comparison to `p=reject`: the choice between them belongs to the owner and depends on how sure they are that their list of senders is complete.

## 11.5. Localization

Russian, Uzbek, and English are required under [1.0 §13](../prd/13-human-readable-messages-localization.md#13-user-messages-and-localization). A missing translation of any message remains a build error.

The Uzbek catalogue is prepared alongside the others. Native-speaker review takes place after release and is not a release gate. Until that review, the quality of specialized terminology remains a translation limitation.

## 11.6. Acceptance Criteria

- **AC-11.1** A check's message describes what was read in the records, not the purpose of the mechanism.
- **AC-11.2** The list of forbidden causal claims in [§11.2](11-messages.md#112-forbidden-causal-claims) is enforced by the message configuration check.
- **AC-11.3** No message in the category asserts anything about the fate of a message.
- **AC-11.4** An unknown selector and unavailable outbound connections are explained as a limitation of 2check.
- **AC-11.5** The message about an unknown selector lists the names tried and offers to take a selector.
- **AC-11.6** The "I accept no mail" record is described as a declared refusal, not as a missing setting.
- **AC-11.7** `p=quarantine` is described as a policy in force, with no comparison to `p=reject`.
- **AC-11.8** Uzbek wording is present for every message in the category; its absence remains a build error.

---
