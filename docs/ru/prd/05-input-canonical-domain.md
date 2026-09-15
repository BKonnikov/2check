# 5. Входные данные и канонический объект домена

<!-- nav:start -->
[Концепция](../01-concept.md) · [Оглавление PRD](../02-prd.md) · [English](../../en/prd/05-input-canonical-domain.md)
<!-- nav:end -->

§5 определяет правила предварительной обработки и ввода.

## 5.1. Допустимые входные данные

Принимаются:

- имя хоста;
- HTTP URL;
- HTTPS URL;
- строка в формате URL без указания схемы.

В MVP отклоняются:

- IP-адрес;
- имя хоста с подстановочным знаком;
- адрес электронной почты;
- имя хоста из одной метки;
- имена владельцев записей, например `_dmarc.example.uz`;
- учётные данные в URL;
- нестандартный порт.

## 5.2. Обработка IDN

Используется следующая последовательность:

```text
trim
→ hostname extraction
→ lowercase where applicable
→ Unicode normalization
→ UTS #46 Nontransitional
→ IDNA validation
→ ASCII / punycode
```

Применяются стандартные ограничения DNS на длину меток и имени хоста.

## 5.3. Объект CanonicalDomain

```text
CanonicalDomain {
  originalInput
  inputType: HOSTNAME | URL | URL_LIKE
  unicodeHostname
  asciiHostname
  publicSuffix: string | null
  publicSuffixType: ICANN | PRIVATE | UNKNOWN
  registrableDomain: string | null
  labels[]
  isIdn
  hadTrailingDot
}
```

`registryDomain` намеренно **не входит** в `CanonicalDomain`.

## 5.4. Граница регистрации домена

`registrableDomain` определяется правилами предварительной обработки и PSL.

Снимок PSL является версионируемым элементом конфигурации согласно §20: его изменение меняет вычисленный `registrableDomain`.

`registryDomain` определяется конкретным `registryProvider` и возвращается модулем регистрации домена.

## 5.5. Исправление опечаток

В MVP отсутствуют автоматическое исправление опечаток и предложения замены.

## 5.6. Критерии приёмки

- **AC-5.1** Все модули используют один CanonicalDomain и не нормализуют ввод независимо друг от друга.
- **AC-5.2** `registryDomain` отсутствует в CanonicalDomain.
- **AC-5.3** IP-адреса, имена с подстановочными знаками, адреса почты, имена из одной метки и нестандартные порты отклоняются.
- **AC-5.4** IDN обрабатывается через UTS #46 Nontransitional и punycode.
- **AC-5.5** `publicSuffixType` различает ICANN/PRIVATE/UNKNOWN.
- **AC-5.6** Опечатки не исправляются автоматически.

---
