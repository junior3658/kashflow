# SQLite financial schema foundation (version 2)

## Scope of this change

This change introduces version 1 of the financial SQLite schema and automated database-invariant tests. It is a **foundation only**: the existing WalletService, LedgerEngine, TransactionEngine and API routes still use the in-memory KashflowDatabase maps. No production data has been moved and no financial service has switched to this database yet.

Set FINANCIAL_DATABASE_PATH to select the local database file. The default is data/kashflow-financial.sqlite; database files are ignored by Git.

## Schema guarantees

- Organizations and user memberships are represented in SQLite. An organization wallet requires an active organization, and every transaction carrying an `org_id` must be created by an active member of that organization. Revoked memberships and suspended organizations cannot authorize new transactions.

- Wallet ownership is explicit: USER or ORGANIZATION, with owner-scoped indexes and immutable ownership/currency fields.
- Amounts are integer minor units and constrained to JavaScript's safe-integer range.
- Wallet provider balances are nullable and remain separate from the internal ledger projection. A provider balance cannot be marked VERIFIED without a stored value.
- Transactions preserve all seven states: CREATED, PENDING, PROCESSING, SUCCEEDED, FAILED, CANCELLED, and REFUNDED.
- Transaction financial intent is immutable after creation; SQL triggers restrict status transitions.
- Idempotency keys are unique per user and immutable.
- Wallet reservations are linked to a pending transaction, update the pending-debit projection, and are consumed only after a posted batch or released on failure/cancellation.
- Ledger batches declare equal debit and credit totals. Before posting, SQLite checks the actual entries, currency, transaction state and (for external providers) verified plus reconciled provider evidence.
- Posted ledger entries and batches cannot be edited or deleted. Reversals are separate batches referencing the original posting.
- Wallet and ledger-account balance projections are updated by the validated posting trigger, not by editing historical entries.

## Provider settlement boundary

For a non-INTERNAL transaction, the schema refuses to post a settlement batch unless a provider event for the same transaction/provider is marked VERIFIED and MATCHED. Events must be inserted as UNVERIFIED / PENDING; their payload hash and identity are immutable, and terminal verification/reconciliation decisions cannot be downgraded.

These database constraints do not implement cryptographic webhook verification or provider reconciliation. Those application services still need official Shwary/PayPal event specifications and must set the verification/reconciliation fields only after independently validating signatures, transaction identity, amount, currency and provider status. HTTP 2xx responses and LLM output remain insufficient evidence.

## Migration boundary and demo data

The additive version 2 migration backfills organization identities from existing organization-owned wallets, but intentionally does **not** invent user memberships. Existing organizations must have their legitimate memberships provisioned from the authoritative organization/authentication workflow before organization transactions can be created. The authentication database and financial database are still separate; that provisioning bridge is not yet integrated into the application.

The current db.ts seeds illustrative balances and historical transactions, including provider-labelled records that have no verifiable provider-event evidence. **Those seed records must not be copied into the persistent financial database as real settled funds.** The eventual cutover should start with a clean financial database or explicitly tag imported fixtures as simulated, after a deliberate migration decision. No automatic import is performed by this schema initializer.

## Next implementation steps

1. Add a typed financial repository over this schema.
2. Move wallet creation and reads to SQLite, including durable personal/business wallet provisioning.
3. Move draft creation, idempotency, reservation and state transitions into SQL transactions.
4. Move ledger posting and reversal into the same SQL transaction as wallet and transaction updates.
5. Replace map-backed API reads and remove financial demo fixtures from production mode.
6. Add restart, concurrent-spend, rollback, tenant-isolation and provider-event replay tests before enabling any settlement path.

Until those steps are complete, the financial domain remains a prototype and must not process real funds.
