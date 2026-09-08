# 3. User Scenarios & Scan Modes

## 3.1. Default flow

Primary action запускает:

```text
mode = FULL
cacheMode = NORMAL
```

FULL включает:

```text
DNS + Registry + TLS
```

## 3.2. PARTIAL

Technical user может выбрать непустое подмножество:

```text
dns | registry | tls
```

Если выбраны все три categories, используется `FULL`, а не `PARTIAL`.

## 3.3. Tool pages

```text
/dns-check → PARTIAL [dns]
/whois     → PARTIAL [registry]
/ssl-check → PARTIAL [tls]
```

Tool pages используют те же backend modules и semantics, что FULL scan.

## 3.4. Global Summary

Global Score и global verdict существуют только для `FULL + FINAL`.

PARTIAL показывает category results, но не global Domain Health Score.

## 3.5. Acceptance Criteria

- **AC-3.1** Default flow создаёт FULL NORMAL scan.
- **AC-3.2** PARTIAL допускает только непустое подмножество FULL categories.
- **AC-3.3** Выбор DNS+Registry+TLS создаёт FULL.
- **AC-3.4** Tool pages не имеют отдельной technical semantics.
- **AC-3.5** PARTIAL не получает global Score/verdict.

---
