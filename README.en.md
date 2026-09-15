# 2check.uz

[Русский](README.md) · **English**

Domain technical health explained in plain language. This repository contains the concept, the MVP 1.0 requirements, and the implementation code.

## 01. Product Concept

### [Start with the concept →](docs/en/01-concept.md)

The product purpose, audiences, principles, and MVP boundaries. This is the project's starting document and the first step in the reading order.

## 02. Product Requirements — PRD

| Reading Mode | Document |
|---|---|
| By section | [PRD contents: 28 sections](docs/en/02-prd.md) |
| In sequence | [Complete single-file PRD](dist/en/2check_MVP_1.0_PRD.md) |
| In Russian | [Концепция и PRD на русском](docs/ru/README.md) |

The PRD develops the concept into data contracts, DNS/registration/TLS checks, interface requirements, security rules, and 221 acceptance criteria.

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

## Development

The MVP code lives in a pnpm monorepo:

```text
apps/
├── api/                 Internal web API on Fastify
└── web/                 Web interface on Next.js

packages/
├── contracts/           Shared API enumerations and constants
└── domain/              Status, severity, and aggregation rules
```

Local startup:

```bash
docker compose up -d
cp .env.example .env
pnpm install
pnpm build
pnpm migrate
pnpm dev
```

Compose starts Redis and PostgreSQL: Redis serves the reusable result cache, PostgreSQL is the authoritative scan store. Code changes are checked with the same commands CI runs:

```bash
pnpm lint
pnpm build
pnpm test
```

`pnpm dev` starts the internal web API on port 3001 and the web interface on 3000. Open http://localhost:3000 and enter a domain: all three MVP categories work: DNS — four-resolver comparison, name existence and answer consistency; registration over RDAP for the `.uz` zone with a WHOIS fallback; and SSL/TLS — a pinned-address connection with certificate checks.

A developer inspector prints what the finished modules produce for one input:

```bash
pnpm inspect example.uz
pnpm inspect example.uz --address 169.254.169.254
```

## Languages and Updates

The Russian and English editions are updated together. Field names, status codes, formulas, and acceptance criterion identifiers match. Two documentation languages do not change the product's RU/UZ/EN requirement.

All changes are made in **`main`**. Both editions and their compiled outputs are checked before pushing:

```bash
python3 scripts/build_prd.py
python3 scripts/check_docs.py
```

[Documentation contribution rules](CONTRIBUTING.en.md) describe editorial review and translation confirmation. The original frozen [concept file](docs/concept.md) remains at its previous location. The Russian and English reading editions clarify the wording while preserving the original product decisions.
