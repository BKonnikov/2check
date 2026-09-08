# 24. SEO, Routing & Public Tool Pages

§24 является normative owner public frontend routing/indexing SEO policy.

## 24.1. Indexable pages

Indexable product/tool pages:

```text
/{locale}/
/{locale}/dns-check
/{locale}/whois
/{locale}/ssl-check
```

Locale prefixes:

```text
ru | uz | en
```

`/` может быть locale-neutral entry/x-default.

## 24.2. Scan route

```text
/{locale}/scan/{scanId}
```

Individual scan pages всегда `noindex` независимо от verdict/score/cache.

scanId, не domain, является route identity.

No public `/domain/{domain}` permanent history resource MVP.

## 24.3. Canonical/hreflang

Localized indexable pages self-canonical и reciprocal hreflang.

Query prefill/tracking params не создают canonical variants.

Canonical не заменяет `noindex` scan page.

## 24.4. Sitemap

Только intended indexable pages. Scan/API/gated routes отсутствуют.

robots.txt не является security boundary и не заменяет page `noindex`.

## 24.5. Honest SEO scope

- DNS page не заявляет true geo DNS;
- WHOIS page не заявляет universal all-TLD support;
- SSL page не заявляет cipher grading/HSTS/OCSP/HTTP checks.

Tool pages содержат полезный explanatory content, но deep repair guides — Phase 2.

## 24.6. Share relation

Built-in Share Result не создаёт share URL/page/indexable entity. Existing scan route остаётся noindex read route.

## 24.7. Privacy

`originalInput`/PII не включаются в SEO metadata. Health Score не размечается как review/aggregate rating.

Crawler GET к tool/scan page не запускает external scan/refresh.

## 24.8. Acceptance Criteria

- **AC-24.1** Product/tool pages indexable, individual scans noindex.
- **AC-24.2** Scan route использует opaque scanId.
- **AC-24.3** Scan routes не sitemap/history directory.
- **AC-24.4** SEO copy не обещает out-of-scope features.
- **AC-24.5** Built-in Share не создаёт dedicated share URL.
- **AC-24.6** Crawler GET не запускает network scan.
- **AC-24.7** PII/originalInput не попадают в SEO metadata.

---
