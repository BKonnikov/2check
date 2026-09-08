# 4. Technical Architecture and System Boundaries

<!-- nav:start -->
[Concept](../01-concept.md) · [PRD Contents](../02-prd.md) · [Русский](../../ru/prd/04-technical-architecture-system-boundaries.md)
<!-- nav:end -->

## 4.1. MVP Technology Stack

- Frontend: Next.js.
- Backend: Node.js/Fastify **or** Python/FastAPI.
- Redis: mandatory.
- MVP hosting: one VPS.

The backend language and runtime are selected by the technical architecture without changing the product contract.

## 4.2. Runtime Components

The main logical components are:

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

## 4.3. Network Access Boundary

A user-controlled target is not passed directly to an arbitrary network client. Network execution follows CanonicalDomain → required DNS checks → security validation → a connection to a pinned IP address.

## 4.4. Platform HTTPS

The 2check web interface and API use a trusted HTTPS certificate. Managing the platform's own certificate is an operational dependency.

## 4.5. Acceptance Criteria

- **AC-4.1** Redis is a mandatory MVP component.
- **AC-4.2** The MVP can be deployed on one VPS.
- **AC-4.3** MVP correctness does not depend on Kubernetes, multiple regions, or a distributed scheduler.
- **AC-4.4** Network modules do not bypass security validation.
- **AC-4.5** The public 2check web interface and API are served over trusted HTTPS.

---
