# 24. SEO, Routing, and Tool Pages

<!-- nav:start -->
[Concept](../01-concept.md) · [PRD Contents](../02-prd.md) · [Русский](../../ru/prd/24-seo-routing-public-tool-pages.md)
<!-- nav:end -->

§24 defines public frontend routes and indexing rules.

## 24.1. Indexable Pages

Indexable product and tool pages:

```text
/{locale}/
/{locale}/dns-check
/{locale}/whois
/{locale}/ssl-check
```

Language prefixes:

```text
ru | uz | en
```

`/` may serve as a language-neutral entry point and x-default.

## 24.2. Scan Route

```text
/{locale}/scan/{scanId}
```

Individual scan pages always have `noindex`, regardless of verdict, score, or cache state.

The route is identified by scanId rather than by the domain.

The MVP has no permanent public history resource at `/domain/{domain}`.

## 24.3. Canonical URLs and hreflang

Indexable language pages are self-canonical and have reciprocal hreflang links.

Prefill and tracking query parameters do not create separate canonical variants.

Canonical does not replace a scan page's `noindex`.

## 24.4. Sitemap

Only pages intended for indexing are included. Scan, API, and gated routes are excluded.

robots.txt is not a security boundary and does not replace a page's `noindex`.

## 24.5. SEO Claims and Product Capabilities

- the DNS page does not claim geographically distributed checking;
- the WHOIS page does not promise support for every TLD;
- the SSL page does not claim cipher grading or HSTS/OCSP/HTTP checks.

Tool pages contain useful explanatory content; detailed repair guides belong to Phase 2.

## 24.6. Relationship to Result Sharing

Built-in result sharing creates no sharing URL, page, or indexable entity. The existing scan route remains a noindex read route.

## 24.7. Privacy

`originalInput` and personal data are excluded from SEO metadata. The health score is not marked up as a review or aggregate rating.

A crawler GET to a tool or scan page does not start an external scan or refresh.

## 24.8. Acceptance Criteria

- **AC-24.1** Product and tool pages are indexable; individual scans have noindex.
- **AC-24.2** The scan route uses an opaque scanId.
- **AC-24.3** Scan routes are absent from the sitemap and any history directory.
- **AC-24.4** SEO text does not promise out-of-scope capabilities.
- **AC-24.5** Built-in result sharing does not create a dedicated sharing URL.
- **AC-24.6** A crawler GET does not start a network scan.
- **AC-24.7** Personal data and originalInput are absent from SEO metadata.

---
