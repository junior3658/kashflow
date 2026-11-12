# KASHFLOW
### AI-Powered Financial Orchestration Platform

> **One financial intelligence. Multiple financial ecosystems.**

KASHFLOW is a fintech prototype designed to bring personal finance, business cash-flow operations, payment-provider orchestration and AI-assisted financial workflows into one interface.

The project explores how a unified financial core can coordinate different payment rails while keeping accounting rules, transaction states and human approval separate from AI-generated recommendations.

**Current delivery:** functional full-stack prototype with simulated provider adapters. It is not a production payment service and must not be used to move real customer funds.

---

## Contents
- [Product vision](#product-vision)
- [What is implemented](#what-is-implemented)
- [Important implementation boundaries](#important-implementation-boundaries)
- [Architecture](#architecture)
- [Technology stack](#technology-stack)
- [Run locally](#run-locally)
- [Environment configuration](#environment-configuration)
- [Tests](#tests)
- [Project structure](#project-structure)
- [Security and responsible use](#security-and-responsible-use)
- [Roadmap](#roadmap)
- [Documentation](#documentation)

## Product vision

KASHFLOW has two main user experiences:

- **KASHFLOW Personal:** a personal finance workspace for viewing multi-currency wallets, reviewing transactions, preparing transfers, exploring exchange quotes and using a simulated digital-asset portfolio.
- **KASHFLOW Business:** a business-oriented workspace for treasury visibility, payout workflows, team roles and reconciliation concepts.
- **KASH AI:** a conversational assistant that interprets financial requests, provides analysis and prepares action previews. Financial actions must remain controlled by deterministic backend logic and explicit user approval.

The initial market context includes the Democratic Republic of the Congo, where mobile money services are important payment rails. The architecture is intended to be adaptable to additional markets and providers.

## What is implemented

The repository currently contains the following prototype modules:

| Area | Implemented in the repository | Current qualification |
|---|---|---|
| Web application | React interface, Personal / Business / Admin views | Prototype |
| API server | Express REST API under `/api/v1` | Local application API |
| Financial ledger | Debit/credit validation, reversal logic, trial-balance calculation | In-memory implementation |
| Wallets | USD, EUR and CDF wallet models and balance views | Seeded demo data |
| Transactions | Draft, confirmation, cancellation and transaction-state logic | Local simulation |
| PayPal | Order/capture adapter contract and checkout-style flow | **Mock adapter; no live PayPal API calls yet** |
| Shwary | Capability boundary, encashment and payout adapter interfaces | **Mock adapter; no live Shwary API calls yet** |
| Provider routing | Provider option and fee-routing logic | Prototype |
| Currency exchange | Quote and conversion workflow | Local/demo rate implementation |
| Digital assets | BTC, ETH and USDT portfolio and trade simulation | Simulation only; no blockchain transactions |
| KASH AI | NLP, financial intelligence, assistant and orchestration modules | Depends on configured Gemini access |
| Security scenarios | Ten scenario definitions and a test runner | Prototype regression tests; not a formal security certification |

### Financial accounting principle

The ledger enforces the double-entry invariant for each currency:

```text
Total Debits = Total Credits
```

Amounts are represented in integer minor units (for example, cents) in the ledger implementation. A posted correction should be represented by a reversal entry rather than silently editing the original accounting record.

The application distinguishes internal accounting values, provider-related values, pending amounts and simulated crypto values. Demo balances shown in the interface are seeded sample data, not real bank or mobile-money balances.

## Important implementation boundaries

Transparency matters in financial software. The following limitations are intentional and must be understood when evaluating the current version:

1. **No real-money processing:** the current PayPal and Shwary adapter implementations generate local/demo responses. They do not establish a live connection to either provider.
2. **PayPal:** the repository contains a sandbox-oriented adapter contract and checkout-style approval URL, but the current adapter does not perform OAuth token acquisition, HTTP order creation, capture requests or genuine cryptographic webhook verification. A successful local response is not proof of a PayPal payment.
3. **Shwary:** encashment, payout and balance methods currently return simulated values. Actual API integration requires the official merchant documentation, approved credentials and provider-side verification.
4. **Shwary settlement boundary:** the project does not assume that collected C2B funds can be reused directly for B2C payouts. That capability remains unconfirmed and is treated as a settlement/compliance boundary.
5. **Persistence:** application data is held in an in-memory database seeded at startup. Data is reset when the server process restarts. A durable production database and migrations are not yet integrated.
6. **Authentication:** the current API uses a seeded demo session identity. The role-switch route is for prototype demonstration, not production authentication or authorization.
7. **AI:** the AI assistant can help interpret and prepare requests; it must not be treated as an autonomous payment authority. AI output is not a source of truth for balances, fees, provider status or transaction completion.
8. **Crypto:** digital-asset operations are paper-trading simulations only. No custody, wallet keys, deposits, withdrawals or on-chain trades are provided.

For these reasons, descriptions such as “production-ready”, “live payment integration”, “verified provider balance” or “real-time settlement” should not be inferred from this prototype.

## Architecture

KASHFLOW currently follows a **modular monolith** approach: one Node.js/Express server hosts the API and the Vite-powered React application. This keeps the prototype straightforward to run while separating the main business domains into modules.

```text
React 19 + Vite + Tailwind
          |
          | HTTP / JSON
          v
Express API (/api/v1)
          |
          +-- Identity and demo roles
          +-- Wallets and transactions
          +-- Financial ledger
          +-- Provider routing
          |     +-- PayPal adapter (mock)
          |     +-- Shwary adapter (mock)
          +-- Currency exchange
          +-- Crypto simulation
          +-- KASH AI orchestration
          +-- Audit and test scenarios
          |
          v
In-memory seeded data store
```

### Transaction lifecycle

The prototype models a controlled transaction lifecycle:

```text
CREATED -> PENDING -> PROCESSING -> SUCCEEDED
                                  -> FAILED
          PENDING ----------------> CANCELLED
SUCCEEDED ------------------------> REFUNDED (reversal flow)
```

A real provider integration must only mark a transaction successful after independently verifying the provider's authoritative response or signed webhook. The current mock adapters do not provide that production guarantee.

More detail is available in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [docs/FINANCIAL_CORE.md](docs/FINANCIAL_CORE.md).

## Technology stack

- **Runtime:** Node.js 22+
- **Backend:** Express 4, TypeScript
- **Frontend:** React 19, Vite 8, Tailwind CSS v4
- **Icons and motion:** Lucide React, Motion
- **AI SDK:** Google GenAI TypeScript SDK
- **Tests:** TypeScript test runners using `tsx`

## Run locally

### Prerequisites

- Node.js 22 or a compatible supported Node.js version
- npm 10+

### Installation

```bash
git clone https://github.com/junior3658/kashflow.git
cd kashflow
npm install
```

### Configure environment variables

Create a local `.env` file from the example:

```bash
cp .env.example .env
```

Then set the values required for the features you want to try. Do not commit your real API keys or secrets.

### Start the application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The development server starts Express and mounts the Vite middleware in the same process.

### Production build

```bash
npm run build
```

The repository also defines `npm start` for starting the Express server in production mode after the frontend build has been generated.

## Environment configuration

The tracked `.env.example` currently documents the Gemini and application URL placeholders. The provider adapters also reference these optional configuration names:

| Variable | Purpose |
|---|---|
| `GEMINI_API_KEY` | Gemini API access for AI features |
| `APP_URL` | Public application URL where required by hosted flows |
| `PAYPAL_CLIENT_ID` | PayPal Sandbox client identifier (future live adapter wiring) |
| `PAYPAL_CLIENT_SECRET` | PayPal Sandbox secret (future live adapter wiring) |
| `PAYPAL_BASE_URL` | PayPal API base URL; Sandbox by default |
| `SHWARY_MERCHANT_ID` | Shwary merchant identifier (future live adapter wiring) |
| `SHWARY_API_KEY` | Shwary API credential (future live adapter wiring) |

**Note:** adding credentials to `.env` does not activate a real provider integration in the current code. Never place secrets in frontend code, screenshots, commits or public documentation.

## Tests

Run the repository test command:

```bash
npm test
```

The test runner includes ledger, AI-agent and security-scenario test modules. These tests exercise application logic and simulated scenarios; they do not certify the security of a deployed financial service or prove that external providers are connected.

Run the TypeScript check:

```bash
npm run lint
```

Run the frontend production build:

```bash
npm run build
```

## Project structure

```text
kashflow/
├── docs/
│   ├── ACCEPTANCE_REPORT.md
│   ├── AI_ARCHITECTURE.md
│   ├── ARCHITECTURE.md
│   ├── FINANCIAL_CORE.md
│   ├── PAYPAL_INTEGRATION.md
│   ├── SECURITY.md
│   └── SHWARY_INTEGRATION.md
├── public/
│   └── assets/
├── src/
│   ├── backend/
│   │   ├── ai/
│   │   ├── providers/
│   │   ├── security/
│   │   ├── db.ts
│   │   ├── ledger.ts
│   │   ├── routes.ts
│   │   ├── transactions.ts
│   │   └── wallets.ts
│   ├── components/
│   │   ├── admin/
│   │   ├── ai/
│   │   ├── business/
│   │   └── personal/
│   ├── App.tsx
│   └── main.tsx
├── tests/
├── .env.example
├── package.json
└── server.ts
```

## Security and responsible use

KASHFLOW is a demonstration and research prototype, not a bank, payment institution, custodian or licensed financial service. Use only test data and provider sandboxes. Do not enter real customer information or use the application to initiate real transfers.

Before any real-money pilot, the project requires, at minimum:

- Real authentication, session management and server-side authorization.
- Persistent transactional database, migrations, constraints and concurrency controls.
- Provider API integration using official documentation and securely managed credentials.
- Authentic webhook signature verification, replay protection and idempotent event handling.
- Reconciliation against provider statements and operational monitoring.
- Independent security review, privacy controls and applicable legal/regulatory approvals.

See [docs/SECURITY.md](docs/SECURITY.md) for the current security design notes.

## Roadmap

- [x] Personal, Business and Admin prototype experiences
- [x] Modular Express API and React application
- [x] Double-entry ledger logic and transaction lifecycle model
- [x] AI agent modules and conversational interface
- [x] PayPal and Shwary adapter interfaces
- [x] Currency exchange and crypto paper-trading modules
- [ ] Replace in-memory storage with durable database persistence
- [ ] Implement real authentication and authorization
- [ ] Integrate and verify PayPal Sandbox REST API end to end
- [ ] Integrate Shwary using approved merchant documentation and credentials
- [ ] Add provider webhook endpoints and genuine signature verification
- [ ] Add CI workflow, deployment configuration and end-to-end tests
- [ ] Complete security, privacy and regulatory readiness review

## Documentation

- [System architecture](docs/ARCHITECTURE.md)
- [Financial core and ledger](docs/FINANCIAL_CORE.md)
- [AI architecture](docs/AI_ARCHITECTURE.md)
- [Security notes](docs/SECURITY.md)
- [PayPal integration plan](docs/PAYPAL_INTEGRATION.md)
- [Shwary integration boundary](docs/SHWARY_INTEGRATION.md)
- [Development status](DEVELOPMENT_STATUS.md)
- [Acceptance and QA notes](docs/ACCEPTANCE_REPORT.md)

---

**KASHFLOW — a prototype exploring safer, AI-assisted financial orchestration.**
