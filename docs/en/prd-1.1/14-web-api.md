# 14. The Web API and Scan Modes

<!-- nav:start -->
[Concept](../01-concept.md) · [PRD 1.1 Contents](../03-prd-1.1.md) · [Русский](../../ru/prd-1.1/14-web-api.md)
<!-- nav:end -->

[§14](14-web-api.md#14-the-web-api-and-scan-modes) defines how the `email` category enters the contract of the internal web API and the scan modes. The responsible sections are [1.0 §17](../prd/17-internal-web-api-contract.md#17-internal-web-api-contract) and [1.0 §3](../prd/03-user-scenarios-scan-modes.md#3-user-scenarios-and-scan-modes); the endpoints, the acceptance model and the polling rules are not changed here.

## 14.1. Selecting Categories

The enumeration in the request gains one value:

```text
selectedCategories?: (dns | registry | tls | email)[]
```

The rule in [1.0 §17](../prd/17-internal-web-api-contract.md#17-internal-web-api-contract) is kept word for word: `PARTIAL` takes a non-empty proper subset of the categories, and selecting them all creates a `FULL` scan. A proper subset is now a subset of four categories rather than of three.

After `email` is added, a `PARTIAL` request selecting `dns`, `registry`, and `tls` is valid because it selects a proper subset of the available categories.

## 14.2. The Selector

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

The field is accepted only when `email` is within the scan scope. Otherwise, the request is rejected with HTTP `422`, identifying the invalid field. The supplied value is not ignored.

The value is validated as a DNS name label. A selector that fails that validation is rejected before any query is made, rather than becoming a search that finds nothing.

The selector belongs to the request and not to the domain: the cache rules are [§12](12-cache.md#12-caching-and-data-freshness).

## 14.3. Score and Verdict

An overall score and an overall verdict exist only for `FULL + FINAL` — [1.0 §3](../prd/03-user-scenarios-scan-modes.md#3-user-scenarios-and-scan-modes). Adding a category does not change that: a `PARTIAL` scan of the `email` category alone shows its results without an overall score for the domain.

## 14.4. Errors

The category introduces no error codes of its own. A rejection over the selector uses the common `WebApiError` contract of [1.0 §17](../prd/17-internal-web-api-contract.md#17-internal-web-api-contract), naming the field.

## 14.5. Acceptance Criteria

- **AC-14.1** The enumeration of selectable categories gains the value `email`.
- **AC-14.2** Selecting all four categories creates a `FULL` scan; `PARTIAL` with all four is rejected with HTTP `422`.
- **AC-14.3** `PARTIAL` with the `dns`, `registry` and `tls` categories is permitted.
- **AC-14.4** The `dkimSelector` field is accepted only when the `email` category is within the scope of the scan.
- **AC-14.5** A request carrying `dkimSelector` without the `email` category is rejected with HTTP `422` and is not executed.
- **AC-14.6** The value of `dkimSelector` is validated as a DNS name label before any query is made.
- **AC-14.7** A `PARTIAL` scan with the `email` category receives no overall score and no overall verdict.
- **AC-14.8** The category introduces no web API error codes of its own.

---
