# Appendix B. Consistency Conditions

<!-- nav:start -->
[Concept](../01-concept.md) · [PRD Contents](../02-prd.md) · [Русский](../../ru/prd/appendix-b.md)
<!-- nav:end -->

The specification is internally consistent when all of the following conditions hold:

- each semantic object has one DTO;
- each configuration dimension has one canonical version field name;
- obsolete reason codes are absent;
- metric naming contracts are not duplicated;
- the frontend does not infer backend health or retry semantics;
- Public/Technical projections contain no gated personal data or secrets;
- the `scanId` access model is explicit;
- FULL/PARTIAL semantics are explicit;
- acceptance through `POST /scans` is separate from the terminal result obtained through `GET`;
- numerical score and confidence remain independent dimensions;
- the reusable cache and historical ScanResult serve distinct roles;
- security validation failures and network execution failures can be distinguished;
- image sharing creates no sharing-link storage or entities;
- acceptance criteria are numbered sequentially within each section;
- temporary patch, continuation, and placeholder criterion markers are absent.
