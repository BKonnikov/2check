# Appendix B. Consolidation Invariants

The PRD is considered internally consolidated only if all are true:

- one DTO per semantic concept;
- one canonical version field name per configuration dimension;
- no obsolete reason codes;
- no duplicate metric naming contracts;
- frontend does not infer backend Health/retry semantics;
- Public/Technical projections contain no gated PII/secrets;
- `scanId` access model is explicit;
- FULL/PARTIAL semantics are explicit;
- `POST /scans` acceptance-state vs terminal `GET` semantics are explicit;
- Score and Confidence remain separate dimensions;
- reusable cache and historical ScanResult are separate roles;
- Security-stage and network-stage failures are distinguishable;
- Share image does not create share-link storage/entities;
- all section Acceptance Criteria are sequential within their section;
- no temporary patch/footer/acceptance-placeholder markers remain.
