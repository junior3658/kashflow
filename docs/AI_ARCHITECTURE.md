# KASHFLOW — Multi-Agent AI Infrastructure Specification

## 1. System Overview

KASHFLOW AI rejects monolithic chatbot design in favor of an **orchestrated multi-agent architecture**. Each agent possesses a narrow, verifiable mandate with clear security boundaries.

```
                           +--------------------------+
                           |       USER REQUEST       |
                           +------------+-------------+
                                        |
                                        v
                           +--------------------------+
                           |      AI ORCHESTRATOR     |
                           |  - Intent classification |
                           |  - Security token guard  |
                           |  - Agent dispatch        |
                           |  - Cost & latency monitor|
                           +------------+-------------+
                                        |
      +-------------------+-------------+-------------+--------------------+
      |                   |                           |                    |
      v                   v                           v                    v
+--------------+   +---------------+          +---------------+   +----------------+
|  NLP AGENT   |   |   FINANCIAL   |          |   FINANCIAL   |   |    SECURITY    |
| - Parse Text |   |  INTELLIGENCE |          |   ASSISTANT   |   |  REVIEW AGENT  |
| - Extract    |   | - Analyzes    |          | - Converses   |   | - Pre-flight   |
|   Entities   |   |   verified data          | - Explains    |   |   safety check |
| - Structured |   | - Anomaly     |          | - Previews    |   | - Anomaly flag |
|   JSON output|   |   detection   |          |   draft ops   |   | - RBAC audit   |
+--------------+   +---------------+          +---------------+   +----------------+
      |                   |                           |                    |
      +-------------------+-------------+-------------+--------------------+
                                        |
                                        v
                           +--------------------------+
                           |  PERMITTED TOOL LAYER    |
                           | (Read-only + Draft Only) |
                           +--------------------------+
```

---

## 2. Agent Responsibilities & Rules

### 2.1 NLP Agent
- **Responsibility**: Interprets user input, normalizes colloquial expressions into structured financial requests, and extracts entities (amount, currency, counterparty, payment rails).
- **Hard Security Invariant**: **NEVER** executes financial operations or interacts directly with payment gateways.
- **Output Schema**: Pydantic / TypeScript schema containing `intent`, `confidence`, `entities`, `missing_information`, and `requires_confirmation`.

### 2.2 Financial Intelligence Agent
- **Responsibility**: Inspects verified historical data from the ledger and provider accounts to compute spending velocity, burn rate, fee leakage, and anomaly detection.
- **Hard Security Invariant**: **NEVER** fabricates balances or transaction states. If backend data is incomplete, it explicitly reports missing telemetry.

### 2.3 Financial Assistant Agent
- **Responsibility**: The user-facing conversational guide (KASH AI). Explains financial movements, prepares transaction drafts, and formats interactive cards (transaction preview, exchange rate breakdown, payment method comparisons).
- **Hard Security Invariant**: **NEVER** marks an operation as completed when only a draft or pending state exists. Explicit user confirmation through backend cryptographic token is mandatory.

### 2.4 AI Orchestrator
- **Responsibility**: Coordinates requests, routes to the appropriate specialist agent, manages context windows, tracks token consumption and pricing, enforces rate limits, and triggers fallback models when latency or timeout thresholds are breached.

### 2.5 Security Review Agent
- **Responsibility**: Scans proposed actions and tool invocation payloads for injection risks, unauthorized cross-tenant data requests, anomalous transfer amounts, and duplicate submissions.

---

## 3. Permitted Tools & Sandboxing

All tools are executed through a permission-aware gateway with authenticated user context:
- `get_wallet_balances(userId, orgId?)`: Read-only.
- `get_transactions(userId, filters)`: Read-only.
- `get_exchange_rate(fromCurrency, toCurrency)`: Read-only indicative rate.
- `calculate_payment_fees(amount, currency, provider)`: Pure deterministic calculation.
- `create_transfer_draft(draftPayload)`: Writes a temporary non-executable draft.
- `create_payment_draft(draftPayload)`: Writes a temporary non-executable draft.

*Tools that commit ledger entries or call provider capture APIs are strictly prohibited from the LLM execution environment.*
