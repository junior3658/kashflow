# Authentication implementation status

## What is implemented on this branch

- Public landing page with sign-in and account-creation entry points.
- Email/password registration, six-digit email verification, sign-in and sign-out.
- Resend email delivery through the Resend HTTPS API. The API key and sender address are read only by the backend.
- Password hashing with Node.js scrypt and a per-account random salt.
- SQLite persistence for authentication users, verification codes and sessions.
- Verification codes are stored as SHA-256 hashes, expire after ten minutes, and have a five-attempt limit.
- Opaque random session tokens are stored as SHA-256 hashes and delivered in HttpOnly, SameSite=Lax cookies.
- Protected application API routes, per-user transaction reads, wallet ownership checks, per-user AI conversation history and per-user audit-log reads.
- Basic per-process authentication throttling. Production must also apply rate limits at the reverse proxy or hosting edge.

## Server configuration

Copy `.env.example` to `.env` locally and configure:

- `RESEND_API_KEY`: Resend API key, server-side only.
- `RESEND_FROM_EMAIL`: sender identity verified in Resend.
- `APP_URL`: public application origin.
- `AUTH_DATABASE_PATH`: local SQLite file path (defaults to `data/kashflow-auth.sqlite`).

Never commit `.env`, the SQLite database, or provider credentials.

The server requires Node.js 22.13 or newer because the dependency set and build toolchain target modern Node runtimes.

## Important prototype boundaries

**Only authentication records are persisted in SQLite.** Wallets, ledger entries, transactions, crypto simulation state, audit data and parts of the application domain are still in-memory. They reset on server restart and are not yet a durable financial system. A user created through this flow receives empty prototype USD, EUR and CDF wallets; no real or demo funds are credited.

This branch does not certify the financial engine for multi-user production use. Before any real-money use, move the entire financial domain into a transactional database, enforce tenant-scoped queries at the data layer, add migrations and concurrency controls, and test every authorization boundary.

The Shwary callback remains deliberately unverified and cannot settle funds. PayPal remains a mock adapter unless separately implemented and tested.

## Local verification still required

After cloning this branch and configuring the local environment:

1. Install dependencies with `npm install`.
2. Run `npm run lint`, `npm test` and `npm run build`.
3. Configure a verified Resend sender and test registration using an email inbox you control.
4. Test invalid, expired, reused and over-attempted verification codes.
5. Test session persistence, logout, unauthorized requests and two-account data isolation.
6. Confirm that the SQLite file is ignored by Git.

No claim of successful compilation, automated test completion, provider delivery or production readiness is made until those checks are actually run.
