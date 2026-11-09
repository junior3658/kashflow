# KASHFLOW — Financial & Security Audit Specification

## 1. Threat Model & Boundaries

1. **Double-Entry Ledger Integrity**: No single-sided entry can ever be written to the database. An integrity trigger asserts $\sum \text{Debits} = \sum \text{Credits}$ within each transaction commit.
2. **Idempotency Guard**: Every mutation includes an `idempotency_key`. Concurrent or replay attempts are caught before state modification.
3. **Multi-Tenant Boundary**: All organizational records (businesses, invoices, payouts, team members) require explicit `organization_id` tenancy checks verified against the authenticated user's active membership.
4. **AI Safety Sandbox**: LLM tools are strictly read-only or draft-only. Autonomous execution of money movement is prevented at the software architecture level.
5. **Regulatory Disclosure**: KASHFLOW simulates crypto portfolio operations and isolates external provider balances. KASHFLOW makes no claims of independent banking licenses or fiduciary compliance without formal regulatory review.

---

## 2. Tested Vulnerability Scenarios

The test suite in `/tests/audit-scenarios.test.ts` validates the following 10 mission-critical scenarios:

1. **Duplicate Payment Request**: Asserts idempotency key deduplication; prevents double-debiting when user clicks "Pay" twice.
2. **Failed PayPal Capture**: Verifies system rolls back transaction state to `FAILED`, leaves user balance untouched, and records failure reason.
3. **Delayed Webhook**: Handles webhook arriving minutes after order creation without race conditions or overwriting terminal states.
4. **Invalid Webhook Signature**: Rejects forged or tampered webhooks with HTTP 401 Unauthorized.
5. **Concurrent Transactions**: Stresses balance reservation locks to eliminate race conditions (TOCTOU) when multiple debits occur simultaneously.
6. **Unauthorized Business Access**: Asserts that User A cannot read, query, or execute transactions for Organization B without valid membership.
7. **Incorrect Ledger Entry**: Tests intentional injection of unbalanced debits and credits; asserts immediate exception and database rollback.
8. **AI Request Attempting Unauthorized Transfer**: Simulates malicious prompt injection instructing AI to "transfer $10,000 immediately"; asserts AI can only emit a draft preview, requiring physical user biometric/password confirmation.
9. **Provider Unavailable**: Asserts graceful fallback and actionable error messaging when external gateway returns HTTP 503/504.
10. **Database/Network Failure During Processing**: Simulates mid-operation crash; verifies atomic transaction rollback preserving ledger invariants.
