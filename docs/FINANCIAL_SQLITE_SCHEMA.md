# SQLite financial schema and partial persistent transfer engine (version 7)

## Current implementation status — 27 November 2026

The financial SQLite repository is now used for provisioned-wallet reads and for **zero-fee USD internal wallet-to-wallet transfers**. The persistent path atomically stores draft intent and per-user idempotency, reserves funds on PENDING, posts balanced debit/credit ledger entries, updates wallet and liability-account projections, consumes the reservation and marks SUCCEEDED. Owner-scoped cancellation releases an active reservation. Amounts enter the API as exact decimal strings and are stored as integer minor units.

Authentication still uses a separate SQLite database. Verified users receive zero-balance personal wallets; eligible BUSINESS accounts receive a zero-balance organization wallet and OWNER membership. A revoked or unavailable business workspace is not reactivated during login and does not prevent personal authentication.

This is a **partial cutover, not a production financial system**. Legacy demo wallets and some map-backed paths remain for compatibility. The persistent transfer path currently supports USD only and zero fees. Provider settlement, FX, EUR/CDF transfers, legacy demo-balance import and production operations remain disabled or incomplete. Owner-scoped application reversals are now available for completed zero-fee USD persistent internal transfers only. Shwary and PayPal cannot settle funds.

## Original schema foundation scope (November 2026)

This section records the original version 2 schema foundation and its initial database-invariant tests. At that stage, the existing WalletService, LedgerEngine, TransactionEngine and API routes still used the in-memory KashflowDatabase maps. Subsequent implementation milestones are recorded below.

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

The additive version 2 migration backfills organization identities from existing organization-owned wallets, but intentionally does **not** invent user memberships. Existing organizations must have their legitimate memberships provisioned from the authoritative organization/authentication workflow before organization transactions can be created. Authentication and financial databases remain separate; the verified-user provisioning bridge is now integrated in the auth runtime for zero-balance personal and self-registered business workspaces.

The current db.ts seeds illustrative balances and historical transactions, including provider-labelled records that have no verifiable provider-event evidence. **Those seed records must not be copied into the persistent financial database as real settled funds.** The eventual cutover should start with a clean financial database or explicitly tag imported fixtures as simulated, after a deliberate migration decision. No automatic import is performed by this schema initializer.

## Remaining implementation steps

1. Extend the persistent refund/reversal operation to cover authorization-revocation policies, operational audit trails and replay across process restarts; the current exact inverse implementation is restricted to zero-fee USD internal transfers.
2. Extend persistent internal transfers beyond zero-fee USD only after currency-specific account provisioning, fee accounting and exact amount parsing are defined.
3. Migrate remaining map-backed wallet, transaction, ledger and idempotency paths; explicitly decide how demo balances are retired or imported as simulated fixtures.
4. Implement provider-event ingestion with official Shwary/PayPal specifications, cryptographic signature verification, immutable evidence, replay protection and independent reconciliation before any external posting.
5. Add operational backup/restore, busy-timeout and recovery policy, monitoring, shared rate limiting and production deployment controls.
6. Keep restart, competing-connection, rollback, tenant-isolation and provider-event replay tests in CI.

No real-money processing is authorized by this partial migration.


## Incremental personal-wallet provisioning (November 2026)

The new `FinancialRepository.provisionPersonalWallets` step provisions three zero-balance personal wallet rows (USD/EUR/CDF) and their linked liability accounts for verified auth users. It uses an explicit `BEGIN IMMEDIATE` transaction and is idempotent. The runtime auth bootstrap invokes this provisioning when it loads a verified user.

At this milestone, the repository only provisioned identity and zero-balance wallet/account rows; the later persistent read and internal-transfer milestones below added the operational cutover for provisioned USD wallets. No seeded/demo balances are imported. If a wallet projection is non-zero but its linked ledger account is missing, provisioning fails rather than fabricating an opening entry.

## Incremental business-wallet provisioning (November 2026)

Verified self-registered BUSINESS accounts now provision their organization identity, an ACTIVE OWNER membership with explicit `can_transact = 1`, a zero-balance USD business wallet and its linked LIABILITY ledger account in one `BEGIN IMMEDIATE` transaction. The organization ID is deterministic (`org_<userId>`), and existing suspended organizations, revoked memberships, mismatched wallet identities or non-zero projections without a matching ledger account fail closed. Repeated provisioning is idempotent.

This records the account owner's self-declared business workspace; it is not legal-entity verification, KYC or authorization for provider payouts. Runtime business objects remain for compatibility, while provisioned-wallet reads and the restricted USD internal-transfer path now use SQLite as described below.

Authentication now retries the idempotent runtime/financial provisioning when a verified user signs in. A malformed stored verification-code hash is treated as an invalid code rather than allowing `timingSafeEqual` to throw on unequal buffer lengths.

## Version 4 — persistent organization-membership authorization

Runtime business-wallet reads and internal-transfer authorization now consult the persistent organization membership table in addition to the existing runtime checks. Read access requires an active organization and active membership; transaction access also requires the explicit `can_transact` permission. Revocation is performed through a repository transaction and is terminal: revoked rows cannot be reactivated or deleted/reinserted to restore access. This was initially an authorization bridge. Subsequent milestones moved provisioned-wallet reads and the restricted USD internal-transfer lifecycle into SQLite; legacy demo flows remain map-backed.


## Incremental persistent wallet reads (November 2026)

The authenticated wallet-read API now uses SQLite wallet projections for provisioned personal and business accounts. Repository reads require the authenticated owner for personal wallets and an active persistent membership for organization wallets. Business reads do not fall back to map-backed balances. Personal legacy/demo reads may fall back only when no persistent personal wallet rows are present. Consolidated net worth remains an estimate based solely on the internal wallet projection and fixed illustrative conversion rates; provider balances are never included and are displayed as authoritative only when their status is VERIFIED.

At this milestone the change was read-only; the later persistent internal-transaction milestone below moved the supported USD transfer mutations and ledger posting into SQLite. A zero provider-balance value in the legacy Wallet interface is a display sentinel when provider balance is NULL; the provider status remains NOT_SYNCED and must not be interpreted as a verified provider balance.


## Version 5 — transaction-time tenant and ledger-account guards

Version 5 closes four database-level gaps discovered during the persistent-ledger audit:

- A transaction revalidates its source wallet, optional destination wallet, and active organization membership when entering `PENDING` or `PROCESSING`. Revocation after draft creation therefore blocks a later reservation or processing transition.
- New wallet reservations must start in `ACTIVE`. Directly inserting a `CONSUMED` or `RELEASED` reservation can no longer increase the pending-debit projection without a corresponding lifecycle transition.
- A ledger batch currency must equal the immutable transaction currency.
- A ledger entry linked to a wallet may reference only a wallet owned by the transaction user or by the transaction organization with a currently active `can_transact` membership. Shared system accounts with no wallet link remain available for clearing and platform accounting.

These are SQLite guardrails, not by themselves a completed financial-service migration. The persistent internal USD transfer path is now implemented in the repository and uses these guards; legacy map-backed demo flows remain, so SQLite is not yet the sole operational source of truth.

No provider settlement is enabled by this schema change. Cryptographic webhook verification and independent provider reconciliation remain application-level prerequisites; Shwary and PayPal endpoints and capabilities must not be inferred.


## Version 6 — safe reversals after membership revocation

A posted organization transaction may need an accounting reversal after the initiating member's access has been revoked. Version 6 keeps new `POSTING` entries subject to current tenant authorization, but permits a `REVERSAL` entry against a wallet-linked account only when that exact account, currency, amount and opposite debit/credit direction exist in the already-posted original batch for the same transaction. The existing reversal-posting trigger still verifies the complete inverse multiset before any projection is updated.

This preserves the `REFUNDED` lifecycle without reopening the revoked membership or allowing a reversal to redirect funds to a different tenant. It is an accounting correction path, not renewed user authorization.


## Persistent internal transaction path — 27 November 2026

- Authenticated internal wallet transfers now use the financial SQLite repository when both wallets are provisioned there. The legacy Maps path remains only for seeded prototype wallets that have no persistent rows.
- Draft creation and the per-user idempotency record are inserted atomically. The request fingerprint covers owner, organization, wallet IDs, amount, currency, provider, description and canonicalized metadata.
- PENDING transition and reservation insertion share one BEGIN IMMEDIATE transaction. SQL tenant triggers revalidate the requester and both wallet identities; the reservation trigger checks available minor units.
- Internal settlement changes PENDING to PROCESSING, creates a two-line debit/credit batch, posts it, consumes the reservation, updates both wallet/account projections and marks SUCCEEDED in one SQLite transaction.
- Any failure rolls back the entire settlement and leaves the transaction PENDING with its reservation intact for safe investigation/retry. It does not silently release funds or claim success.
- Cancellation is owner-scoped and uses the SQL state transition trigger to release an active reservation.
- Transaction reads and confirmation/cancellation routes are scoped to the authenticated creator. Provider transactions remain outside this internal path; Shwary/PayPal HTTP responses do not authorize postings.
- The initial implementation intentionally supports zero-fee internal transfers only. Provider settlement, exchange, cross-currency postings and legacy demo-balance import remain disabled or unmigrated. Exact inverse refunds are limited to zero-fee USD persistent internal transfers.


## Version 7 — transaction initial-state and posting-amount guards

New transaction rows must begin in `CREATED`; direct SQL inserts cannot skip the draft state by creating a `PENDING`, `PROCESSING` or terminal transaction. Before a `POSTING` batch is marked posted, its debit total must equal the immutable transaction amount plus fee. The existing batch balance check then requires credits to equal the same total. A balanced batch with the wrong financial amount therefore cannot update ledger or wallet projections.

The guards are additive and apply to newly inserted transactions and newly posted batches. They do not rewrite existing rows or import historical/demo balances.

## Persistent internal transfers and balance provenance — 27 November 2026

- The internal transfer lifecycle is now backed by SQLite for provisioned wallets: draft creation and per-user idempotency, PENDING reservation, PROCESSING, balanced posting, wallet/account projections, reservation consumption, SUCCEEDED and cancellation share explicit SQL transactions.
- This path is intentionally restricted to zero-fee USD wallet-to-wallet transfers. Provider settlement, FX and demo-balance imports remain disabled or unmigrated. Exact inverse refunds are implemented only for zero-fee USD internal transfers in the persistent repository.
- The legacy in-memory idempotency map is never allowed to shadow a request whose wallets are persistent. If the same user/key already exists in the legacy map, the persistent request fails closed and requires a new key; the map-backed idempotency fingerprint also includes description and metadata.
- Seeded in-memory demo wallets are explicitly marked `isSimulated = true`. Wallet APIs identify simulated demo balances separately from estimated values based on persistent internal-ledger projections. Missing provenance is surfaced as legacy/unverified rather than silently treated as persistent.
- The personal and business wallet interfaces display SIMULATED, PERSISTENT or UNVERIFIED provenance. A simulated business workspace labels its other illustrative dashboard metrics as demo data as well.


## Exact API amounts and idempotent internal retries — 27 November 2026

- The internal transfer API accepts USD amounts as decimal strings with at most two fractional digits and converts them directly to integer cents. It rejects floating-point JSON numbers, excess precision, exponent notation, zero, negatives and values outside JavaScript's safe-integer range; it does not multiply a binary floating-point value and round it.
- Persistent internal transfers require a caller-supplied idempotency key. The key is unique per authenticated user and bound to a canonical request fingerprint.
- Repeating confirmation after a committed SUCCEEDED transfer returns the already-settled transaction only when its posted POSTING batch exists; it does not create another batch.
- Repeating cancellation after CANCELLED returns the existing terminal transaction only when no active reservation remains.
- These guarantees apply to the provisioned persistent internal-transfer path. Legacy map-backed demo flows remain a separate compatibility path and are not suitable for real settlement.
