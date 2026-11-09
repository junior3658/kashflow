# KASHFLOW — System Architecture Specification

## 1. Executive Summary

**KASHFLOW** is an enterprise-grade financial orchestration platform embodying the principle:  
> *"One Financial Intelligence. Multiple Financial Ecosystems."*

It bridges fragmented financial rails—including commercial banks, mobile money operators (such as Shwary), PayPal global payment rails, automated currency exchange desks, and simulated digital assets—under a unified double-entry ledger and a multi-agent AI copilot framework.

```
                     +---------------------------------------+
                     |         KASHFLOW CLIENT APPS          |
                     |  - Personal Web & Mobile PWA          |
                     |  - Business Financial Operations      |
                     |  - Platform Administration Console    |
                     +-------------------+-------------------+
                                         |  HTTPS / REST / SSE
                                         v
                     +---------------------------------------+
                     |         KASHFLOW FULL-STACK CORE      |
                     |             (Express + Vite)          |
                     +-------------------+-------------------+
                                         |
      +------------------+---------------+------------------+-------------------+
      |                  |                                  |                   |
      v                  v                                  v                   v
+------------+   +---------------+                  +---------------+   +---------------+
| FINANCIAL  |   | MULTI-AGENT   |                  | PAYMENT       |   | SECURITY &    |
| CORE       |   | AI COPILOT    |                  | PROVIDERS     |   | AUDIT ENGINE  |
| - Wallets  |   | - Orchestrator|                  | - PayPal Rail |   | - RBAC Guard  |
| - Ledger   |   | - NLP Agent   |                  | - Shwary Rail |   | - Idempotency |
| - State    |   | - Fin Intel   |                  | - Exchange    |   | - Webhook Sig |
|   Machine  |   | - Assistant   |                  | - Crypto Sim  |   | - Immutable   |
| - Reversal |   | - Safe Tools  |                  | - Router      |   |   Audit Logs  |
+------------+   +---------------+                  +---------------+   +---------------+
```

---

## 2. Layered Architecture

### 2.1 Presentation Layer (Frontend)
- **Framework**: React 19 SPA running on Vite 8 with Tailwind CSS v4.
- **Design System**: Deep navy `#090D16` / slate `#0F172A` surface, electric blue `#2563EB` accents, hairline dividers (`border-slate-800`), tabular typography (`JetBrains Mono` for numerals), zero-pill metadata discipline.
- **Surface Portals**:
  1. **KASHFLOW Personal**: Cash flow overview, wallet balances, quick transfers, PayPal checkout, currency exchange, crypto simulator.
  2. **KASHFLOW Business**: Corporate financial overview, team role management, payment links, bulk payouts, transaction reconciliation, organizational isolation.
  3. **KASHFLOW Admin**: Platform liquidity, provider health, audit logs, user governance.
  4. **KASH AI Copilot**: Omnipresent floating drawer and full assistant screen with streaming responses, transaction draft preview cards, exchange rate quotes, and interactive approval flows.

### 2.2 Orchestration & API Layer (Backend)
- **Runtime**: Node.js 22 with Express & TypeScript (`server.ts`).
- **RESTful Endpoints**: Modular route handlers for `/api/v1/auth`, `/api/v1/wallets`, `/api/v1/transactions`, `/api/v1/payments`, `/api/v1/exchange`, `/api/v1/crypto`, `/api/v1/ai`, `/api/v1/audit`, and `/api/v1/test-scenarios`.
- **Development Server**: Dev mode mounts `vite.middlewares` directly on port 3000 for zero-latency development and unified single-port hosting.

### 2.3 Financial Core & Ledger Layer
- **Double-Entry Engine**: Every financial movement writes balanced debit and credit entries to immutable ledger accounts. Invariant: $\sum \text{Debits} = \sum \text{Credits}$.
- **Precision**: Fractional units are represented using integer minor units (cents) or fixed-precision arithmetic to prevent IEEE 754 floating-point drift.
- **Idempotency Guard**: Idempotency keys (`Idempotency-Key` header or payload key) prevent duplicate charges.

### 2.4 Multi-Agent AI System
- Powered by `@google/genai` (utilizing `gemini-3.8-flash` for classification and high-speed interaction, and `gemini-4-argon` / thinking level where complex reasoning is required).
- Composed of 4 decoupled agents: **AI Orchestrator**, **NLP Agent**, **Financial Intelligence Agent**, and **Financial Assistant Agent**, backed by a strict **Security Reviewer** and permission-checked tool layer.

---

## 3. Request Lifecycle

1. **Client Request**: Authenticated with session token. Idempotency key supplied for mutating financial operations.
2. **Authorization Middleware**: Verifies tenant membership and role permissions (`PERSONAL_USER`, `BUSINESS_OWNER`, `BUSINESS_ADMIN`, `BUSINESS_EMPLOYEE`, `PLATFORM_ADMIN`).
3. **Transaction Drafting**: When financial action is initiated (via UI or KASH AI), a `DRAFT` is created. Sensitive operations NEVER execute automatically.
4. **User Confirmation**: Explicit review of fees, source wallet, destination, and provider details.
5. **Execution & Provider Handshake**: Provider adapter communicates with sandbox/external API (PayPal order capture, Shwary transfer).
6. **Ledger Posting**: Upon verified provider confirmation, double-entry ledger entries are committed atomically.
7. **Audit & Event Emission**: Notification generated, audit log stamped with actor, IP, timestamp, and signature.
