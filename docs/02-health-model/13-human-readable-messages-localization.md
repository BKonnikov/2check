# 13. Human-readable Messages & Localization

§13 является нормативным владельцем message semantics и localization.

## 13.1. Message model

Используется только `MessageDescriptor` §6.

Check message отвечает: **что показал конкретный check**.

Issue message отвечает: **какая подтверждённая проблема обнаружена, почему это важно и что делать**.

Issue message может отличаться от primary Check message.

## 13.2. Human explanation pattern

```text
Fact → Impact → Recommendation
```

Impact/recommendation добавляются только если их можно утверждать evidence-bound.

## 13.3. UNKNOWN wording

UNKNOWN формулируется как «не удалось проверить/получить данные» и не обвиняет target.

`provider_not_supported` явно объясняется как limitation 2check.

## 13.4. PASS wording

PASS не преобразуется автоматически в «всё настроено правильно».

Например AAAA resolve PASS + ABSENT → «AAAA не обнаружена».

## 13.5. Unsupported causality

Запрещены необоснованные утверждения вроде:

- resolver mismatch = DNS propagation;
- IPv6 connect failure = firewall;
- NXDOMAIN = домен свободен для покупки;
- Registry failure = домен не зарегистрирован;
- untrusted chain = сертификат отвергают все браузеры.

## 13.6. Localization

Mandatory locales:

```text
ru | uz | en
```

Missing mandatory translation — build/config error.

Runtime fallback: requested locale → EN → safe generic message.

Raw code может показываться только Technical context.

## 13.7. Acceptance Criteria

- **AC-13.1** MessageDescriptor единый для Check/Issue/WebApiError.
- **AC-13.2** UNKNOWN language не утверждает target defect.
- **AC-13.3** provider_not_supported объясняется как limitation продукта.
- **AC-13.4** PASS wording factual, не шаблонно-positive.
- **AC-13.5** Unsupported causality запрещена.
- **AC-13.6** RU/UZ/EN mandatory.
- **AC-13.7** Missing translation блокирует production configuration/build.
- **AC-13.8** Message params structured, escaped, без pre-rendered HTML.

---
