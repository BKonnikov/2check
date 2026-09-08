# 02. Требования к продукту — PRD

[01. Концепция](01-concept.md) · [Документация](README.md) · [English](../en/02-prd.md)

MVP 1.0 · 28 разделов · 218 критериев приёмки.

[Читать PRD одним файлом](../../dist/ru/2check_MVP_1.0_PRD.md). Для знакомства с продуктом сначала прочитайте концепцию; для реализации используйте соответствующие разделы ниже.

## Основы продукта

| № | Раздел |
|---|---|
| 01 | [Цель продукта и позиционирование](prd/01-product-goal-positioning.md) |
| 02 | [Границы MVP и дорожная карта](prd/02-mvp-scope-roadmap.md) |
| 03 | [Пользовательские сценарии и режимы сканирования](prd/03-user-scenarios-scan-modes.md) |
| 04 | [Техническая архитектура и границы системы](prd/04-technical-architecture-system-boundaries.md) |
| 05 | [Входные данные и канонический объект домена](prd/05-input-canonical-domain.md) |
| 06 | [Общие контракты данных и уровни доступа](prd/06-common-data-contracts-exposure.md) |
| 07 | [Статусы, зависимости и результаты сканирования](prd/07-shared-status-dependency-category-scan-semantics.md) |

## Проверки домена

| № | Раздел |
|---|---|
| 08 | [Проверка DNS](prd/08-dns.md) |
| 09 | [Регистрация домена](prd/09-registry.md) |
| 10 | [Проверка SSL/TLS](prd/10-ssl-tls.md) |

## Оценка и сообщения

| № | Раздел |
|---|---|
| 11 | [Сводка технического здоровья и выявленные проблемы](prd/11-domain-health-summary-issues.md) |
| 12 | [Числовая оценка здоровья домена](prd/12-domain-health-score.md) |
| 13 | [Пользовательские сообщения и локализация](prd/13-human-readable-messages-localization.md) |

## Выполнение и API

| № | Раздел |
|---|---|
| 14 | [Кэширование и актуальность данных](prd/14-cache-freshness.md) |
| 15 | [Безопасность и защита от SSRF](prd/15-security-ssrf.md) |
| 16 | [Оркестрация и выполнение сканирования](prd/16-scan-orchestration-execution-model.md) |
| 17 | [Контракт внутреннего веб-API](prd/17-internal-web-api-contract.md) |
| 18 | [Классификация ошибок и обработка сбоев](prd/18-error-taxonomy-failure-handling.md) |

## Данные и эксплуатация

| № | Раздел |
|---|---|
| 19 | [Модель данных и хранение](prd/19-data-model-persistence.md) |
| 20 | [Управление конфигурацией и политиками](prd/20-configuration-policy-management.md) |
| 21 | [Наблюдаемость, журналирование и мониторинг](prd/21-observability-logging-operational-monitoring.md) |
| 22 | [Производительность и ограничения ресурсов](prd/22-performance-resource-limits-nfr.md) |

## Интерфейс и доступ

| № | Раздел |
|---|---|
| 23 | [Пользовательский интерфейс и представление результатов](prd/23-frontend-ux-result-presentation.md) |
| 24 | [SEO, маршрутизация и страницы инструментов](prd/24-seo-routing-public-tool-pages.md) |
| 25 | [Конфиденциальность, доступ и защита от злоупотреблений](prd/25-privacy-data-protection-abuse-boundaries.md) |

## Качество и развитие

| № | Раздел |
|---|---|
| 26 | [Тестирование и критерии выпуска](prd/26-testing-quality-gates-acceptance-strategy.md) |
| 27 | [Развёртывание, среды и управление выпусками](prd/27-deployment-environments-release-management.md) |
| 28 | [Продуктовая аналитика и показатели использования](prd/28-product-analytics-success-metrics.md) |

## Приложения

- [A. Ответственные разделы](prd/appendix-a.md)
- [B. Условия согласованности](prd/appendix-b.md)
