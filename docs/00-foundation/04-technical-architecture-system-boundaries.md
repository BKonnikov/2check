# 4. Technical Architecture & System Boundaries

## 4.1. MVP stack

- Frontend: Next.js.
- Backend: Node.js/Fastify **или** Python/FastAPI.
- Redis: mandatory.
- MVP hosting: один VPS.

Конкретный backend language/runtime выбирается Technical Architecture и не меняет Product Contract.

## 4.2. Runtime boundaries

Основные logical components:

```text
Web Frontend
Internal Web API
Scan Orchestrator
DNS Module
Registry Module
TLS Module
Security Validation
Redis Reusable Cache
Scan Store
Sensitive/Gated Store
Observability
```

## 4.3. Network boundary

User-controlled target не передаётся напрямую arbitrary network client. Network execution проходит CanonicalDomain → DNS prerequisites → Security Validation → pinned connection.

## 4.4. Public platform TLS

Frontend/API 2check работают через trusted HTTPS certificate. Собственный certificate lifecycle 2check является operational dependency.

## 4.5. Acceptance Criteria

- **AC-4.1** Redis является обязательным MVP component.
- **AC-4.2** MVP deployable на одном VPS.
- **AC-4.3** MVP correctness не зависит от Kubernetes/multi-region/distributed scheduler.
- **AC-4.4** Network modules не обходят Security Validation.
- **AC-4.5** 2check public frontend/API обслуживаются trusted HTTPS.

---
