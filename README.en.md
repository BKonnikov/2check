# 2check.uz

[Русский](README.md) · **English**

A service for checking a domain's technical health. This repository contains the concept, product requirements, and MVP 1.0 implementation.

## 01. Product Concept

### [Start with the concept →](docs/en/01-concept.md)

The product purpose, audiences, principles, and MVP boundaries. This is the first document for understanding the project.

## 02. MVP 1.0 — Domain Checks

DNS, domain registration, and SSL/TLS. 28 sections and 221 acceptance criteria.

[PRD 1.0 contents](docs/en/02-prd.md) · [Complete document](dist/en/2check_MVP_1.0_PRD.md)

The implementation is in `apps/` and `packages/`. Available code does not replace release validation; current limitations are listed in the [deployment guide](DEPLOY.en.md).

## 03. MVP 1.1 — Mail Health

SPF, DMARC, DKIM, MX, STARTTLS, and PTR. 17 sections and 130 acceptance criteria.

[PRD 1.1 contents](docs/en/03-prd-1.1.md) · [Complete document](dist/en/2check_MVP_1.1_PRD.md)

The specification is in development and extends the frozen PRD 1.0. The `email` category is not yet implemented. Blocklist checking is outside the release scope.

## Documents and Languages

| Document | Русский | English |
|---|---|---|
| Navigation | [Документация](docs/ru/README.md) | [Documentation](docs/en/README.md) |
| Documentation workflow | [Правила редактирования](CONTRIBUTING.md) | [Contribution rules](CONTRIBUTING.en.md) |
| Deployment | [Установка и эксплуатация](DEPLOY.md) | [Deployment and operations](DEPLOY.en.md) |

```text
docs/
├── ru/
│   ├── 01-concept.md    Concept
│   ├── 02-prd.md        MVP 1.0 contents
│   ├── 03-prd-1.1.md    MVP 1.1 contents
│   ├── prd/             MVP 1.0 sections
│   └── prd-1.1/         MVP 1.1 sections
└── en/                  The same structure in English

dist/
├── ru/                  Complete PRDs for both releases
└── en/                  Complete PRDs for both releases
```

## Development

The stack is Next.js, Node.js/Fastify, PostgreSQL, and Redis. Code is organized as a pnpm monorepo:

```text
apps/
├── api/                 Web API and check execution
└── web/                 User interface

packages/
├── contracts/           Shared data contracts
├── domain/              Check and assessment logic
└── messages/            RU/UZ/EN messages
```

Local development requires the Node.js version in `.nvmrc`, the pnpm version in `package.json`, and Docker Compose. Create a local configuration during initial setup:

```bash
cp .env.example .env
docker compose up -d
pnpm install
pnpm build
pnpm migrate
pnpm dev
```

The web interface is available at `http://localhost:3000`, and the internal API runs on port 3001. Redis serves the cache; PostgreSQL stores scan results. The interface and messages support RU/UZ/EN.

Application checks before pushing changes:

```bash
pnpm lint
pnpm build
pnpm test
```

A developer tool displays module results:

```bash
pnpm inspect example.uz
pnpm inspect example.uz --address 169.254.169.254
```

## Updating Documentation

Work takes place in **`main`**. Russian and English editions are updated and reviewed together. After editing, build and validate the documents as described in the [contribution rules](CONTRIBUTING.en.md):

```bash
python3 scripts/build_prd.py
python3 scripts/check_docs.py
```

The frozen [original concept](docs/concept.md) remains unchanged. Both reading editions preserve its product decisions. Two documentation languages do not change the product's RU/UZ/EN requirement.
