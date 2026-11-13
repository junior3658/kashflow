# Financial Core Hardening — Phase 1

**Branch:** `feature/public-home-auth`  
**Status:** code changes committed; automated execution results not yet verified.

## Changes in this phase

- Transaction amounts must be positive safe integers in minor currency units.
- A source wallet must exist, be active, match the transaction currency, and belong to the authenticated user or the explicitly supplied organization.
- Idempotency keys are scoped by user and reused keys are rejected when the transaction's financial payload differs.
- A transaction must be `PENDING` before the generic execution engine can settle it.
- Generic execution is restricted to `INTERNAL` USD transactions. External provider transactions cannot be marked successful by the generic engine.
- Pending funds and the wallet balance are checked before settlement.
- The balanced ledger batch is posted before the in-memory wallet balance is changed.
- Internal wallet debits and credits no longer overwrite the provider-reported balance with the internal accounting balance.
- The simulated PayPal order endpoint is disabled; it no longer returns a fake checkout URL as if a provider order had been created.
- The transfer API creates a reservation before returning a draft and rejects provider values other than `INTERNAL`.
- PayPal capture is temporarily disabled because the prototype does not yet persist PayPal order ownership or implement an atomic, idempotent capture-to-ledger workflow.
- Malformed percent-encoded session cookies are rejected safely.
- Transaction safety regression tests now cover successful pending settlement, cross-tenant wallet rejection, external-provider settlement rejection, insufficient-funds reservation rejection, idempotency payload conflicts, and separation of internal/provider balances.

## Important limitations

This is a containment and hardening phase, **not** the SQLite financial-core migration.

- Wallets, ledger entries, transactions, organizations, and idempotency records are still in-memory and are lost on process restart.
- The current ledger chart and settlement mapping support only the USD internal-transfer path. EUR/CDF internal settlement is deliberately rejected until currency-specific accounts and balanced postings are implemented.
- Shwary collection remains an accepted request only. Its callback is not cryptographically verified and cannot settle or credit funds.
- Shwary payouts and merchant-balance reads remain blocked pending official endpoint and payload specifications.
- PayPal OAuth, verified capture persistence, webhook verification, and reconciliation remain incomplete.
- The existing demo seed data is not a production customer balance.
- No claim of production readiness, CI success, or real-provider payment testing is made.

## Required next phase

1. Run lint, the full test suite, and production build in a Node.js 22.14+ environment.
2. Resolve every observed failure before extending the financial migration.
3. Introduce a dedicated SQLite financial database with schema migrations and foreign-key constraints.
4. Persist tenants, wallets, transactions, idempotency records, ledger batches, and immutable ledger entries.
5. Use SQLite transactions for reservation, ledger posting, and wallet projection updates; add concurrent-request tests.
6. Add verified provider-event storage and reconciliation before enabling any external settlement.

