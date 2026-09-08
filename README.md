# 2check.uz — Product Documentation

**2check.uz — проверка технического здоровья домена простым языком.**

## Project status

MVP 1.0 product concept is frozen and the consolidated MVP 1.0 PRD is final. The repository is currently documentation-first; product implementation is the next stage.

## Where to start

1. [Frozen Product Concept](docs/concept.md) — immutable product boundary already maintained in this repository.
2. [PRD navigation](docs/README.md) — canonical section-by-section specification.
3. [Compiled PRD](dist/2check_MVP_1.0_PRD.md) — generated single-file snapshot for review/export.
4. [Contribution rules](CONTRIBUTING.md) — how to change the specification without creating duplicate sources of truth.

## Repository structure

```text
.
├── README.md
├── CONTRIBUTING.md
├── docs/
│   ├── concept.md
│   ├── README.md
│   ├── _meta/
│   ├── 00-foundation/
│   ├── 01-domain-checks/
│   ├── 02-health-model/
│   ├── 03-runtime/
│   ├── 04-platform/
│   ├── 05-product-experience/
│   ├── 06-quality-operations/
│   └── appendices/
├── scripts/
│   ├── build_prd.py
│   └── check_docs.py
├── dist/
│   └── 2check_MVP_1.0_PRD.md
└── .github/
    ├── workflows/
    └── PULL_REQUEST_TEMPLATE/
```

## Source-of-truth rule

Each requirement, schema, policy, code catalog, metric name or numeric rule has exactly one normative owner. Other sections reference that owner instead of redefining the same semantics.

The split files under `docs/` are the normative PRD source. `docs/concept.md` remains the frozen product boundary. `dist/2check_MVP_1.0_PRD.md` is generated and must not be edited manually.

## Build and validate

```bash
python3 scripts/build_prd.py
python3 scripts/check_docs.py
```

Build after editing canonical sources, then validate. The integrity check verifies Acceptance Criteria numbering and that the compiled PRD is current without changing files. To check only the compiled snapshot, run `python3 scripts/build_prd.py --check`.
