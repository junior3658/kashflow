# Authentication implementation status

## What is implemented on this branch

- Public landing page with sign-in and account-creation entry points.
- Email/password registration, six-digit email verification, sign-in and sign-out.
- Resend email delivery through the Resend HTTPS API. The API key and sender address are read only by the backend.
- Password hashing with Node.js scrypt and a per-account random salt.
- SQLite persistence for authentication users, verification codes and sessions.
- Verification codes are stored as salted scrypt hashes, expire after ten minutes, and have a five-attempt limit. Passwords are also stored as salted scrypt hashes.
- Verification-code consumption and account verification are committed atomically in SQLite; conditional updates prevent concurrent requests from reusing a code or bypassing the attempt limit.
- Verification-code issuance and its 60-second resend cooldown run in one `BEGIN IMMEDIATE` transaction, so concurrent requests cannot create multiple active codes. A code is deleted if Resend rejects delivery, and cooldown responses do not disclose whether an email address belongs to an account.
- Opaque random session tokens are stored as SHA-256 hashes and delivered in HttpOnly, SameSite=Lax cookies.
- Protected application API routes, per-user transaction reads, wallet ownership checks, per-user AI conversation history and per-user audit-log reads.
- Bounded fixed-window authentication throttling per process (10 requests per 15 minutes per IP, with a 5,000-key memory cap that rejects new keys at capacity instead of evicting active quotas). Production must also apply a shared rate limit at the reverse proxy or hosting edge; the local limiter is not distributed.
- Mutating API requests (including public authentication endpoints) require an exact, valid `Origin` matching `APP_URL`; requests without an Origin are rejected. The Shwary callback is currently exempt because it only acknowledges receipt and performs no settlement. This exemption must be removed or replaced with provider verification before callback processing gains side effects.

## Server configuration

Copy `.env.example` to `.env` locally and configure:

- `RESEND_API_KEY`: Resend API key, server-side only.
- `RESEND_FROM_EMAIL`: sender identity verified in Resend.
- `APP_URL`: public application origin.
- `AUTH_DATABASE_PATH`: local SQLite file path (defaults to `data/kashflow-auth.sqlite`).

Never commit `.env`, the SQLite database, or provider credentials.

The server requires Node.js 22.13 or newer because the dependency set and build toolchain target modern Node runtimes.

## Current persistence and authorization boundary (27 November 2026)

Authentication and financial data use separate SQLite files. Verified users receive zero-balance personal USD/EUR/CDF wallets and, for eligible BUSINESS accounts, a zero-balance USD organization wallet with a persistent OWNER membership and linked liability accounts. No seeded/demo balances are imported into these persistent wallets.

The provisioned-wallet internal transfer path is now persistent for **zero-fee USD wallet-to-wallet transfers**. Draft intent and per-user idempotency records are inserted atomically; the PENDING transition and reservation share a SQL transaction; PROCESSING, the balanced debit/credit ledger batch, wallet/account projections, reservation consumption and SUCCEEDED are committed together. Cancellation releases an active reservation transactionally. Exact USD decimal strings are converted directly to integer cents. Restart and competing-connection tests cover durability and double-reservation prevention.

Business membership is revalidated by SQLite at transaction transitions and ledger posting. A terminally revoked or unavailable business workspace is not recreated during login: personal authentication remains available, but the runtime organization context and public organization identifier are withheld. Read access and transaction permission remain distinct.

The migration is still partial. Seeded demo wallets and legacy in-memory transaction paths remain for prototype compatibility; EUR/CDF transfer settlement, non-zero fees, persistent refund/reversal orchestration, provider-event verification, provider reconciliation, and live Shwary/PayPal settlement are not enabled. The seven transaction statuses remain represented in the schema, but this does not mean every provider lifecycle is operational.

The Shwary callback remains a no-op acknowledgement without cryptographic verification and cannot settle funds. Shwary payouts and merchant-balance reads remain disabled. PayPal order creation, capture and webhook verification fail closed. HTTP 2xx responses and LLM output are never settlement evidence.

This branch is **not certified for production real-money use**. Do not import demo balances or activate provider settlement until official provider specifications, signed-event verification, independent reconciliation, operational controls and production database procedures have been implemented and tested.

## Local verification still required

After cloning this branch and configuring the local environment:

1. Install dependencies with `npm install`.
2. Run `npm run lint`, `npm test` and `npm run build`.
3. Configure a verified Resend sender and test registration using an email inbox you control.
4. Test invalid, expired, reused and over-attempted verification codes.
5. Test session persistence, logout, unauthorized requests and two-account data isolation.
6. Confirm that the SQLite file is ignored by Git.

No claim of successful compilation, automated test completion, provider delivery or production readiness is made until those checks are actually run.
