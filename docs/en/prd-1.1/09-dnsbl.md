# 9. Blocklists of the Receiving Server

<!-- nav:start -->
[Concept](../01-concept.md) · [PRD 1.1 Contents](../03-prd-1.1.md) · [Русский](../../ru/prd-1.1/09-dnsbl.md)
<!-- nav:end -->

§9 defines the check of the receiving server's addresses against blocklists: which lists may be used, how their answers are read, and why a refusal never means "clean".

## 9.1. What Is Being Checked

What is checked are the addresses of the hosts obtained from §6. The check answers whether the receiving server's address is listed, and nothing else.

## 9.2. Which Lists May Be Used

Only lists whose published terms permit a public checking service to query them are used.

The set of lists is not enumerated in this section. It is set by versioned configuration under the rules of 1.0 §20, and for each list the configuration holds a link to the terms that permit this use. Terms change more often than a specification does, and a section naming providers by name would go stale before it was implemented.

The rule is strict for a reason rather than out of caution. The terms of the largest of them, Spamhaus, explicitly exclude free queries from services answering other people's requests and require a paid subscription or a key. Another well-known list, SORBS, was closed by its owner in the year two thousand and twenty-four. The obvious set of providers turns out not to be one.

## 9.3. How an Answer Is Read

A list answers a query in one of three ways, and telling them apart is mandatory:

| Answer | What it means |
|---|---|
| the address is listed | a confirmed hit |
| the address is not listed | a confirmed absence |
| the query was refused | there is no answer |

The third is a refusal to serve the query: a rate limit exceeded, an unrecognised source, a key demanded. Lists answer such a query with codes from their own reserved range, for example `127.255.255.254`, and in form those codes are indistinguishable from an answer of "listed".

A refusal is never read as "clean". A check that quietly turns a refusal into a favourable result is worse than no check: it asserts something nobody verified.

## 9.4. Results

| State | Status | Severity |
|---|---|---|
| no address is listed in any list | `PASS` | — |
| an address is listed in at least one list | `FAIL` | `warning` |
| every list refused the query | `UNKNOWN` | — |
| some lists refused the query and there are no hits | `UNKNOWN` | — |

A partial answer gives `UNKNOWN` rather than `PASS`: without having asked them all, we do not know whether the address is clean. A hit, meanwhile, is settled and is reported whether or not the remaining lists answered.

The severity of a hit is `warning` rather than `critical`: being listed does not stop a domain receiving mail, and these data say nothing about the mail it sends — §2.

## 9.5. What the Reader Is Told

The name of the list holding the address, and the address of that list's page where an owner can see the reason and ask to be removed. The reason for the listing is not retold: it is the list that states it, not us.

If no permitted list is configured, the check gives `UNKNOWN` with `reasonCode = dnsbl_no_permitted_source`. That is a state of the deployment, not a property of the domain, and it does not reduce the domain's score.

## 9.6. Technical Failure

| Cause | `reasonCode` |
|---|---|
| the queries to the lists did not complete | `dnsbl_lookup_failed` |
| every list refused the query | `dnsbl_query_refused` |
| no permitted list is configured | `dnsbl_no_permitted_source` |

## 9.7. What the Check Does Not Assert

- That the domain's mail will land in spam: the lists describe the address of the receiving server, not the address the domain sends from — §2.
- That a listing is deserved: the grounds for inclusion are stated by the list, and public data cannot confirm them.
- That absence from the lists means a good reputation: reputation is not assessed this way and is outside the release boundary — §1.

## 9.8. Acceptance Criteria

- **AC-9.1** Only lists whose published terms permit a public checking service to query them are used; the configuration holds a link to those terms for each list.
- **AC-9.2** The set of lists is set by versioned configuration and is not held in the code.
- **AC-9.3** An answer refusing to serve the query is distinguished from an answer of "listed" and is never read as "not listed".
- **AC-9.4** A hit in at least one list gives `FAIL` with severity `warning`.
- **AC-9.5** No hits with an incomplete set of answers gives `UNKNOWN`, not `PASS`.
- **AC-9.6** No configured permitted list gives `UNKNOWN` with a `reasonCode` and does not reduce the domain's numerical score.
- **AC-9.7** The reader is told the name of the list and the address of its page; the reason for the listing is not retold.
- **AC-9.8** The check's messages assert nothing about the domain's outbound mail and do not assess its reputation.

---
