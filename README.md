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
| PayPal | Mock adapter contract retained for development | **Checkout/order and capture API routes disabled; no live PayPal API calls** |
| Shwary | DRC CDF collection endpoint wired to the supplied API sample | **Sandbox request integration; B2C payout and balance pending official endpoint specifications** |
| Provider routing | Provider option and fee-routing logic | Prototype |
| Currency exchange | Indicative quote calculation | **Settlement endpoint disabled until atomic ledger posting, quote expiry and idempotency are implemented** |
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
3. **Shwary:** the documented DRC collection endpoint now makes a server-side API request in Sandbox by default. Payout and merchant-balance operations are not enabled because the supplied sample does not document their endpoints or response contracts. A collection request accepted by HTTP is not proof of a completed payment; settlement requires verified provider confirmation.
4. **Shwary settlement boundary:** the project does not assume that collected C2B funds can be reused directly for B2C payouts. That capability remains unconfirmed and is treated as a settlement/compliance boundary.
5. **Persistence:** application data is held in an in-memory database seeded at startup. Data is reset when the server process restarts. A durable production database and migrations are not yet integrated.
6. **Authentication:** email/password registration, email verification and session authentication are implemented with a separate SQLite auth store. Financial wallets, ledger entries, transactions and organization data remain in-memory; authentication persistence does not make the financial core durable.
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

### 1. Prerequisites

Install the following software before cloning the project:

- **Node.js 22.13 or newer** (64-bit LTS recommended). Check with `node --version`.
- **npm 10 or newer**. Check with `npm --version`.
- **Git**.
- A Windows, macOS or Linux terminal.

The project uses `better-sqlite3`, a native Node.js module. On Windows, use a current 64-bit Node.js installation. If npm reports that it cannot find a prebuilt binary and tries to compile the module, install the Visual Studio C++ Build Tools (Desktop development with C++) and retry.

### 2. Clone the repository

Open PowerShell, Windows Terminal, macOS Terminal or Linux shell:

```bash
git clone https://github.com/junior3658/kashflow.git
cd kashflow
```

To use the latest integration branch before it is merged into `main`:

```bash
git switch feature/public-home-auth
git pull origin feature/public-home-auth
```

Once the integration has been merged, use `git switch main` and `git pull origin main` instead.

### 3. Install dependencies

```bash
npm install
```

Wait for the installation to finish. Do not run `npm run dev` if npm reports an installation error. If dependency resolution fails, use Node.js 22.13+ and a recent npm version, remove only the generated `node_modules` directory, then run `npm install` again. Do not delete the project source files.

### 4. Create your local environment file

**Windows PowerShell:**

```powershell
Copy-Item .env.example .env
```

**macOS / Linux:**

```bash
cp .env.example .env
```

Open `.env` in VS Code and configure the server-side variables. Keep this file private: it is ignored by Git and must never be committed, pasted into issues, or placed in frontend code.

#### Minimum configuration for email registration

Email verification uses Resend. Configure:

```env
APP_URL="http://localhost:3000"
RESEND_API_KEY="re_your_resend_api_key"
RESEND_FROM_EMAIL="KASHFLOW <noreply@your-verified-domain.com>"
AUTH_DATABASE_PATH="data/kashflow-auth.sqlite"
```

In Resend, verify the sending domain/address first. The value in `RESEND_FROM_EMAIL` must be an allowed sender for that Resend account. Without a working Resend configuration, account verification emails cannot be delivered and registration will fail.

#### Optional AI configuration

```env
GEMINI_API_KEY="your_gemini_api_key"
```

Leave it empty if you are not testing the AI features. Never use a key prefixed with `VITE_`; provider secrets must remain on the backend.

#### Optional Shwary Sandbox configuration

```env
SHWARY_MERCHANT_ID="your_sandbox_merchant_id"
SHWARY_MERCHANT_KEY="your_sandbox_merchant_key"
SHWARY_BASE_URL="https://api.shwary.com"
SHWARY_MODE="sandbox"
SHWARY_CALLBACK_URL=""
```

Use the sandbox credentials supplied by Shwary. Do not switch to production until Shwary has approved the merchant account and provided the callback/signature, payout and balance specifications. An accepted collection request is not proof of a completed payment; the current callback does not verify provider signatures or settle a wallet.

#### PayPal

PayPal variables are reserved in `.env.example`, but PayPal checkout and capture routes are intentionally disabled. Adding a Client ID and Secret alone will **not** activate PayPal. Real OAuth, order/capture requests, webhook signature verification, persistent order ownership and reconciliation must be completed first.

### 5. Start in development mode

```bash
npm run dev
```

Open **http://localhost:3000** in your browser. Keep the terminal open while using the application. Press `Ctrl+C` to stop the server.

### 6. Run quality checks

Run these before treating a change as valid:

```bash
npm run lint
npm test
npm run build
```

All three commands must finish successfully. A successful frontend build alone does not certify provider integrations or financial correctness.

### 7. Production-mode local preview

Build the frontend first:

```bash
npm run build
```

**Windows PowerShell:**

```powershell
$env:NODE_ENV = "production"
npm start
```

**macOS / Linux:**

```bash
NODE_ENV=production npm start
```

Then open http://localhost:3000. This is a local production-mode preview, not a deployment or a production-readiness certification.

### 8. Local database files

The authentication database is created automatically at the path configured by `AUTH_DATABASE_PATH` (default: `data/kashflow-auth.sqlite`). Keep the `data/` directory private and back it up securely. Do not upload SQLite database files to GitHub.

**Important financial-data limitation:** authentication records persist in SQLite, but the financial prototype's wallets, transactions, organizations and ledger are still held in process memory at this stage. They reset when the server restarts. Do not deposit, transfer or store real customer funds in this prototype.

## Environment configuration

The tracked `.env.example` documents the required server-side configuration names:

| Variable | Purpose |
|---|---|
| `GEMINI_API_KEY` | Gemini API access for AI features |
| `APP_URL` | Public application URL where required by hosted flows |
| `RESEND_API_KEY` | Resend API key for server-side verification email delivery |
| `RESEND_FROM_EMAIL` | Sender identity verified in Resend |
| `AUTH_DATABASE_PATH` | SQLite file path for authentication accounts and sessions |
| `SHWARY_MERCHANT_ID` | Shwary merchant UUID (server-side only) |
| `SHWARY_MERCHANT_KEY` | Shwary merchant secret (server-side only) |
| `SHWARY_BASE_URL` | Shwary API base URL; defaults to `https://api.shwary.com` |
| `SHWARY_MODE` | `sandbox` by default; use `production` only after provider approval |
| `SHWARY_CALLBACK_URL` | Optional in Sandbox; required in production |
| `PAYPAL_CLIENT_ID` | PayPal Sandbox client identifier (future live adapter wiring) |
| `PAYPAL_CLIENT_SECRET` | PayPal Sandbox secret (future live adapter wiring) |
| `PAYPAL_BASE_URL` | PayPal API base URL; Sandbox by default |
| `PAYPAL_WEBHOOK_ID` | PayPal webhook identifier for future verification |

Shwary collection sends a server-side Sandbox request when valid merchant credentials are configured; its callback is not yet verified and does not settle a wallet. PayPal order/capture routes are disabled; setting PayPal credentials does not enable checkout. Never place secrets in frontend code, screenshots, commits or public documentation.

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
│   │   ├── auth/
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

- Complete persistent financial-domain storage, migrations and concurrency-safe authorization. Basic account authentication is implemented on the feature branch, but the financial domain is still in-memory.
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
- [ ] Replace in-memory financial-domain storage with durable, atomic SQLite persistence
- [x] Implement email/password authentication, email verification and session authorization (feature branch; financial data remains in-memory)
- [ ] Integrate and verify PayPal Sandbox REST API end to end (currently disabled)
- [ ] Integrate Shwary using approved merchant documentation and credentials
- [ ] Add provider webhook endpoints and genuine signature verification
- [ ] Establish passing CI, deployment configuration and end-to-end tests
- [ ] Complete security, privacy and regulatory readiness review

## Documentation

- [Authentication implementation and limitations](docs/AUTHENTICATION.md)
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
