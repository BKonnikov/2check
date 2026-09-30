# 15. The Interface and the Tool Page

<!-- nav:start -->
[Concept](../01-concept.md) · [PRD 1.1 Contents](../03-prd-1.1.md) · [Русский](../../ru/prd-1.1/15-interface.md)
<!-- nav:end -->

[§15](15-interface.md#15-the-interface-and-the-tool-page) defines how the `email` category is shown to the user and which tool page corresponds to it. The responsible sections are [1.0 §23](../prd/23-frontend-ux-result-presentation.md#23-user-interface-and-result-presentation) and [1.0 §24](../prd/24-seo-routing-public-tool-pages.md#24-seo-routing-and-tool-pages); the order of result elements, the verdict rules and the scan route are not changed here.

## 15.1. The Name of the Category

The main name of the category in the interface is "Mail". The Russian and Uzbek editions use their own names, set by the localization.

The names of the checks use the terms the industry uses — `SPF`, `DMARC`, `DKIM`, `MX`, `STARTTLS`, `PTR` — because those are what the user will see in their hosting panel. They are not translated.

The name of a check group is shown in the category card, while the group itself is not a result of its own — [§2](02-check-groups-dependencies.md#2-check-groups-and-the-dependency-on-mx).

## 15.2. The Tool Page

The list of indexable pages in [1.0 §24](../prd/24-seo-routing-public-tool-pages.md#24-seo-routing-and-tool-pages) gains one:

```text
/{locale}/email-check
```

The page creates a `PARTIAL` scan of the single category `email` — the same arrangement the other tool pages have in [1.0 §3](../prd/03-user-scenarios-scan-modes.md#3-user-scenarios-and-scan-modes).

The rules for the canonical address, hreflang and language prefixes are those of [1.0 §24](../prd/24-seo-routing-public-tool-pages.md#24-seo-routing-and-tool-pages), unchanged.

## 15.3. The Selector Field

An optional DKIM selector field sits beside the domain field.

The field is immediately available on the tool page. In a full scan it is hidden by default and revealed through an additional action. Omitting a selector does not prevent the scan from starting.

The field carries an explanation that without it the key is looked for at the known selectors of the mail provider, and that a key not found does not mean there is none — [§5](05-dkim.md#5-dkim).

## 15.4. Showing Partial Results

The encryption check may cover part of what was available: not every host was probed — [§7](07-starttls.md#7-starttls).

The result is then shown together with a statement of what it covers. Showing a partial result as a complete one is not permitted: it is true of what was asked and says nothing about the rest.

## 15.5. The Result Card

Inapplicable checks are shown neutrally and may be collapsed — [1.0 §23](../prd/23-frontend-ux-result-presentation.md#23-user-interface-and-result-presentation). For this category it matters that the reason for inapplicability stays visible: a domain that deliberately accepts no mail and a domain with no records look the same when collapsed and mean different things — [§6](06-mx.md#6-mx).

## 15.6. Acceptance Criteria

- **AC-15.1** The main name of the category in the interface is "Mail"; the names of the checks are not translated.
- **AC-15.2** The list of indexable pages gains the page `/{locale}/email-check`.
- **AC-15.3** The tool page creates a `PARTIAL` scan of the single category `email`.
- **AC-15.4** The selector field is optional and hidden by default in a full scan.
- **AC-15.5** The selector field carries an explanation that a key not found does not mean there is none.
- **AC-15.6** A partial result is shown together with a statement of what it covers.
- **AC-15.7** The reason a check is inapplicable stays visible when collapsed.

---
