# 2check.uz

[Русский](README.md) · **English**

Domain technical health explained in plain language. This repository contains the concept and requirements for MVP 1.0; product implementation is the next stage.

## 01. Product Concept

### [Start with the concept →](docs/en/01-concept.md)

The product purpose, audiences, principles, and MVP boundaries. This is the project's starting document and the first step in the reading order.

## 02. Product Requirements — PRD

| Reading Mode | Document |
|---|---|
| By section | [PRD contents: 28 sections](docs/en/02-prd.md) |
| In sequence | [Complete single-file PRD](dist/en/2check_MVP_1.0_PRD.md) |
| In Russian | [Концепция и PRD на русском](docs/ru/README.md) |

The PRD develops the concept into data contracts, DNS/registration/TLS checks, interface requirements, security rules, and 218 acceptance criteria.

## Document Locations

```text
docs/
├── ru/                  Russian edition
│   ├── 01-concept.md    1. Concept
│   ├── 02-prd.md        2. Requirements contents
│   └── prd/             PRD sections and appendices
└── en/                  English edition with the same structure

dist/
├── ru/                  Complete Russian PRD
└── en/                  Complete English PRD
```

## Languages and Updates

The Russian and English editions are updated together. Field names, status codes, formulas, and acceptance criterion identifiers match. Two documentation languages do not change the product's RU/UZ/EN requirement.

All changes are made in **`main`**. Both editions and their compiled outputs are checked before pushing:

```bash
python3 scripts/build_prd.py
python3 scripts/check_docs.py
```

[Documentation contribution rules](CONTRIBUTING.en.md) describe editorial review and translation confirmation. The original frozen [concept file](docs/concept.md) remains at its previous location. The Russian and English reading editions clarify the wording while preserving the original product decisions.
