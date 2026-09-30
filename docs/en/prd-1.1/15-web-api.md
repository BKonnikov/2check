# 15. The Web API and Scan Modes

<!-- nav:start -->
[Concept](../01-concept.md) · [PRD 1.1 Contents](../03-prd-1.1.md) · [Русский](../../ru/prd-1.1/15-web-api.md)
<!-- nav:end -->

§15 defines how the `email` category enters the contract of the internal web API and the scan modes. The responsible sections are 1.0 §17 and 1.0 §3; the endpoints, the acceptance model and the polling rules are not changed here.

## 15.1. Selecting Categories

The enumeration in the request gains one value:

```text
selectedCategories?: (dns | registry | tls | email)[]
```

The rule in 1.0 §17 is kept word for word: `PARTIAL` takes a non-empty proper subset of the categories, and selecting them all creates a `FULL` scan. A proper subset is now a subset of four categories rather than of three.

One consequence is easy to miss: a `PARTIAL` request for `dns`, `registry` and `tls` was rejected as a full scan before this release and is permitted now. The rule was not rewritten — the set it applies to changed.

## 15.2. The Selector

The request to create a scan gains an optional field:

```text
CreateScanRequest {
  input
  mode: FULL | PARTIAL
  selectedCategories?
  cacheMode?
  dkimSelector?
}
```

The field is accepted only when the `email` category is within the scope of the scan. A request carrying a selector without that category is rejected as invalid: HTTP `422`. Silently ignoring the value is not permitted — a client that sent a selector is entitled to know it was not used.

The value is validated as a DNS name label. A selector that fails that validation is rejected before any query is made, rather than becoming a search that finds nothing.

The selector belongs to the request and not to the domain: the cache rules are §13.

## 15.3. Score and Verdict

An overall score and an overall verdict exist only for `FULL + FINAL` — 1.0 §3. Adding a category does not change that: a `PARTIAL` scan of the `email` category alone shows its results without an overall score for the domain.

## 15.4. Errors

The category introduces no error codes of its own. A rejection over the selector uses the common `WebApiError` contract of 1.0 §17, naming the field.

## 15.5. Acceptance Criteria

- **AC-15.1** The enumeration of selectable categories gains the value `email`.
- **AC-15.2** Selecting all four categories creates a `FULL` scan; `PARTIAL` with all four is rejected with HTTP `422`.
- **AC-15.3** `PARTIAL` with the `dns`, `registry` and `tls` categories is permitted.
- **AC-15.4** The `dkimSelector` field is accepted only when the `email` category is within the scope of the scan.
- **AC-15.5** A request carrying `dkimSelector` without the `email` category is rejected with HTTP `422` and is not executed.
- **AC-15.6** The value of `dkimSelector` is validated as a DNS name label before any query is made.
- **AC-15.7** A `PARTIAL` scan with the `email` category receives no overall score and no overall verdict.
- **AC-15.8** The category introduces no web API error codes of its own.

---
