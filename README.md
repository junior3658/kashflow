# KASHFLOW — AI-Powered Financial Orchestration Platform

> **"One Financial Intelligence. Multiple Financial Ecosystems."**

KASHFLOW is a full-stack, enterprise-grade financial orchestration platform and multi-agent AI copilot. It bridges traditional banking rails, mobile money aggregators (such as Shwary), PayPal global payment corridors, high-precision currency exchange desks, and educational digital asset simulations under a unified double-entry ledger.

---

## 1. Key Capabilities

### 1.1 Financial Core & Double-Entry Ledger
- **Mathematical Invariant**: Every financial posting enforces $\sum \text{Debits} = \sum \text{Credits}$.
- **Immutability & Reversals**: Posted entries cannot be mutated or deleted. Corrections are executed as balanced, auditable reversal entries.
- **Decimal Precision**: All currency amounts are calculated with integer minor units (cents) to eliminate IEEE 754 floating-point rounding errors.
- **Strict Separation of Balances**:
  - External Provider Balance (verified via API handshake)
  - Internal Accounting Ledger Balance
  - Pending Debits & In-Flight Reservations
  - Segregated Simulated Digital Asset Balances

### 1.2 Multi-Agent AI Infrastructure (KASH AI)
Decoupled, specialized agents with strict security boundaries:
1. **AI Orchestrator**: Intent classification, request dispatch, context management, token consumption monitoring, and model fallback.
2. **NLP Agent**: Natural-language understanding and structured JSON extraction. *Hard invariant: Never executes financial operations.*
3. **Financial Intelligence Agent**: Cashflow velocity, spend analysis, and anomaly detection based strictly on verified backend telemetry. *Hard invariant: Never fabricates balances.*
4. **Financial Assistant Agent**: Conversational guidance, transaction drafting, and interactive confirmation cards. *Hard invariant: Sensitive actions must be confirmed through the application backend.*
5. **Security Review Agent**: Pre-flight inspection for injection risks, cross-tenant leaks, and duplicate submissions.

### 1.3 Payment Provider Rails
- **PayPal REST v2 Sandbox**: Order creation, buyer approval flow, cryptographic capture verification, and webhook signature verification.
- **Shwary Mobile Money**: C2B encashment (Vodacom M-Pesa, Airtel Money, Orange Money) and B2C payouts in USD and Congolese Franc (CDF) corridors. Unconfirmed fund reuse is strictly quarantined in transit accounts.
- **Provider Routing Engine**: Transparent fee comparison and optimal rail selection.

### 1.4 Specialized Financial Portals
- **Personal Financial Suite**: Cashflow dashboard, multi-currency wallets (USD, EUR, CDF), interactive Numpad transfer mode, PayPal checkout, currency converter, crypto simulation desk, and spending analytics.
- **Business Operations Suite**: Multi-tenant organization isolation, commercial treasury ($84,250.00), B2C batch payouts, invoice links, role-based access control (RBAC), and automated ledger reconciliation.
- **Security & Audit Console**: Real-time trial balance equilibrium check, immutable audit trail, and an interactive 10-scenario regression test runner.

---

## 2. Technology Stack

- **Backend Runtime**: Node.js 22, Express, TypeScript (`server.ts`).
- **AI Engine**: `@google/genai` TypeScript SDK (`gemini-3.8-flash` for high-throughput classification and conversational copilot).
- **Frontend Framework**: React 19 SPA, Vite 8, Tailwind CSS v4, Lucide Icons.
- **Typography**: Plus Jakarta Sans (Display & Body) paired with JetBrains Mono (Tabular numerals).

---

## 3. Getting Started

### 3.1 Prerequisites
- Node.js >= 20.x
- npm >= 10.x

### 3.2 Installation
```bash
# Clone the repository and install dependencies
npm install
```

### 3.3 Environment Variables
Configure `.env` using `.env.example`:
```env
# Gemini API Key (injected automatically in Google AI Studio)
GEMINI_API_KEY="YOUR_GEMINI_API_KEY"

# PayPal Developer Sandbox (optional for live credentials)
PAYPAL_CLIENT_ID="sandbox_client_id"
PAYPAL_CLIENT_SECRET="sandbox_secret"
PAYPAL_BASE_URL="https://api-m.sandbox.paypal.com"

# Shwary Mobile Money (optional for live credentials)
SHWARY_MERCHANT_ID="shw_merchant_id"
SHWARY_API_KEY="shw_api_key"
```

### 3.4 Running the Application
```bash
# Start full-stack development server on Port 3000
npm run dev
```
Open your browser at `http://localhost:3000`.

### 3.5 Running the Automated Test Suite
```bash
npm test
```
Executes the Double-Entry Ledger Invariant tests, Multi-Agent AI tests, and the 10 Security Audit Scenarios.

---

## 4. Security & Audit Scenarios Tested

The automated test runner in `tests/audit-scenarios.test.ts` validates:
1. **Duplicate Payment Request**: Idempotency key deduplication prevents double-debiting.
2. **Failed PayPal Capture**: Rollback to `FAILED` status with untouched balances.
3. **Delayed Webhook**: Out-of-order webhook delivery handled without state race conditions.
4. **Invalid Webhook Signature**: Cryptographic signature validation rejects forged payloads.
5. **Concurrent Transactions**: Balance reservation locks prevent overdraft race conditions.
6. **Unauthorized Business Access**: Multi-tenant organization boundary strictly blocks non-members.
7. **Incorrect Ledger Entry**: Unbalanced debit/credit postings rejected immediately.
8. **AI Unauthorized Transfer Attempt**: LLM prompts attempting direct execution are constrained to draft previews requiring human confirmation.
9. **Provider Unavailable**: Safe fallback with transparent alternative rails.
10. **Crash Recovery & Trial Balance**: Atomic ledger consistency with trial balance in equilibrium.
