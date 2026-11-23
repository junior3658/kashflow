# SQLite financial schema foundation (version 3)

## Scope of this change

This change introduces version 2 of the financial SQLite schema and automated database-invariant tests. It is a **foundation only**: the existing WalletService, LedgerEngine, TransactionEngine and API routes still use the in-memory KashflowDatabase maps. No production data has been moved and no financial service has switched to this database yet.

Set FINANCIAL_DATABASE_PATH to select the local database file. The default is data/kashflow-financial.sqlite; database files are ignored by Git.

## Schema guarantees

- Organizations and user memberships are represented in SQLite. An organization wallet requires an active organization, and every transaction carrying an `org_id` must be created by an active member with the explicit `can_transact` permission. Membership role alone does not grant transaction authority; revoked memberships and suspended organizations cannot authorize new transactions.

- Wallet ownership is explicit: USER or ORGANIZATION, with owner-scoped indexes and immutable ownership/currency fields.
- Amounts are integer minor units and constrained to JavaScript's safe-integer range.
- Wallet provider balances are nullable and remain separate from the internal ledger projection. A provider balance cannot be marked VERIFIED without a stored value.
- Transactions preserve all seven states: CREATED, PENDING, PROCESSING, SUCCEEDED, FAILED, CANCELLED, and REFUNDED.
- Transaction financial intent is immutable after creation; SQL triggers restrict status transitions.
- Idempotency keys are unique per user and immutable.
- Wallet reservations are linked to a pending transaction, update the pending-debit projection, and are consumed only after a posted batch or released on failure/cancellation.
- Ledger batches declare equal debit and credit totals. Before posting, SQLite checks the actual entries, currency, transaction state and (for external providers) verified plus reconciled provider evidence.
- Posted ledger entries and batches cannot be edited or deleted. Reversals are separate batches referencing the original posting and must contain the exact inverse multiset of original account/currency/amount lines; partial or altered reversals are rejected.
- Idempotency records must use the same user identity as their referenced transaction.
- Wallet and ledger-account balance projections are updated by the validated posting trigger, not by editing historical entries.

## Provider settlement boundary

For a non-INTERNAL transaction, the schema refuses to post a settlement batch unless a provider event for the same transaction/provider is marked VERIFIED and MATCHED, and its normalized confirmed amount and currency exactly match the immutable transaction intent. Events must be inserted as UNVERIFIED / PENDING with a positive integer amount, currency and normalized status (`PENDING`, `CONFIRMED`, `FAILED` or `CANCELLED`). The evidence fields, payload hash and identity are immutable, and terminal verification/reconciliation decisions cannot be downgraded. A `MATCHED` event must be VERIFIED, normalized as CONFIRMED, and match the transaction amount and currency.

These database constraints do not implement cryptographic webhook verification or provider reconciliation. Those application services still need official Shwary/PayPal event specifications and must set the verification/reconciliation fields only after independently validating signatures, transaction identity, amount, currency and provider status. HTTP 2xx responses and LLM output remain insufficient evidence.

## Version 3 migration

Version 3 adds normalized amount, currency and status evidence to provider events. Existing v2 event rows are not backfilled or trusted because their original payloads are not independently verified. A legacy event without the new evidence cannot authorize settlement.

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


## Incremental personal-wallet provisioning (November 2026)

The new `FinancialRepository.provisionPersonalWallets` step provisions three zero-balance personal wallet rows (USD/EUR/CDF) and their linked liability accounts for verified auth users. It uses an explicit `BEGIN IMMEDIATE` transaction and is idempotent. The runtime auth bootstrap invokes this provisioning when it loads a verified user.

This is **not yet a financial-service cutover**: map-backed wallet reads, reservations, transaction state and ledger posting remain in the application. Business-wallet provisioning, authoritative persistent membership reads, ledger operations and transaction persistence remain future steps. No seeded/demo balances are imported. If a wallet projection is non-zero but its linked ledger account is missing, provisioning fails rather than fabricating an opening entry.

## Incremental business-wallet provisioning (November 2026)

Verified self-registered BUSINESS accounts now provision their organization identity, an ACTIVE OWNER membership with explicit `can_transact = 1`, a zero-balance USD business wallet and its linked LIABILITY ledger account in one `BEGIN IMMEDIATE` transaction. The organization ID is deterministic (`org_<userId>`), and existing suspended organizations, revoked memberships, mismatched wallet identities or non-zero projections without a matching ledger account fail closed. Repeated provisioning is idempotent.

This records the account owner's self-declared business workspace; it is not legal-entity verification, KYC or authorization for provider payouts. The runtime still keeps map-backed business objects for compatibility. Financial reads, reservations, transaction state and ledger posting have not yet been cut over to SQLite.

Authentication now retries the idempotent runtime/financial provisioning when a verified user signs in. A malformed stored verification-code hash is treated as an invalid code rather than allowing `timingSafeEqual` to throw on unequal buffer lengths.