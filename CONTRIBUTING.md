# Contributing to the 2check.uz PRD

## 1. Single source of truth

Before adding or changing a requirement, identify its normative owner. Do not duplicate the same rule in multiple sections.

## 2. Frozen product boundary

The file `docs/concept.md` is the immutable frozen product boundary. A PRD change must not silently expand MVP scope beyond it.

## 3. Canonical contracts

When renaming or replacing a DTO, field, reason code, version identifier, metric name or status, remove the obsolete form from normative text instead of keeping both names alive.

## 4. Cross-references

A section may restate context only when needed to explain its own responsibility. The actual semantic rule stays with its normative owner (see Appendix A).

## 5. Acceptance Criteria

Acceptance Criteria must remain sequential within each section. New criteria are added to the end of the section and renumbered when necessary during consolidation.

## 6. Generated file

Do not edit `dist/2check_MVP_1.0_PRD.md` directly. Edit canonical files under `docs/`, then run:

```bash
python3 scripts/build_prd.py
python3 scripts/check_docs.py
```

The integrity check is read-only: it fails if the generated PRD is missing or differs from the canonical sources. Rebuild before validating and include the generated snapshot in the same change.

## 7. Pull requests

A documentation PR should state:

- normative owner(s) changed;
- whether MVP scope changes;
- whether any DTO/API/version/cache compatibility changes;
- whether Acceptance Criteria or tests must change;
- whether the generated PRD was rebuilt.
