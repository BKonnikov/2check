# 1. Product Goal and Positioning

<!-- nav:start -->
[Concept](../01-concept.md) · [PRD Contents](../02-prd.md) · [Русский](../../ru/prd/01-product-goal-positioning.md)
<!-- nav:end -->

## 1.1. Positioning

**2check.uz explains a domain's technical health in plain language.**

The product serves two audiences:

- **general users / business owners** receive a clear verdict, an explanation of the problem, and a concise recommendation;
- **technical users** receive normalized data and a safe representation of technical details.

The primary result is the **domain health verdict**. The numerical score provides additional context.

## 1.2. Product Principles

1. The backend is authoritative for domain health semantics.
2. A single root defect must not incur several independent penalties.
3. Technical uncertainty must not be interpreted as a domain problem.
4. Failing closed when safety cannot be established takes precedence over throughput and interface convenience.
5. Additional checks must not expand MVP scope implicitly, even when they appear simple to implement.
6. Russian, Uzbek, and English (RU / UZ / EN) are mandatory from the MVP release.

## 1.3. Acceptance Criteria

- **AC-1.1** The primary result contains a clear verdict; the numerical score remains secondary.
- **AC-1.2** The frontend does not calculate domain health semantics independently.
- **AC-1.3** Technical users receive a safe data projection rather than an internal DTO or raw dump.
- **AC-1.4** RU / UZ / EN are supported from the MVP release.

---
