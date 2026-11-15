# Financial persistence — current implementation

KASHFLOW now stores its runtime financial-domain snapshot in SQLite.

## Configuration

Set `FINANCIAL_DATABASE_PATH` to a writable path on a persistent volume. The default is:

```text
data/kashflow-financial.sqlite
```

Keep the SQLite database, its `-wal` and `-shm` files out of Git. Back up the database using SQLite's backup API or a quiesced copy; do not copy only the main database file while WAL writes are active.

## What is persisted

The snapshot contains runtime users, organizations, memberships, wallets, ledger accounts, ledger entries, transactions, idempotency records, simulated crypto positions, audit records and AI messages.

The snapshot is committed through one SQLite transaction before an API response is sent. On startup, a valid persisted snapshot takes precedence over demo seed data.

## Important boundary

This is an incremental durability layer, not the final financial database architecture. It serializes the current in-memory domain model into one versioned row. It does **not yet** provide normalized SQL tables, SQL-level foreign keys for each financial entity, per-command atomic wallet/ledger/transaction updates, database-enforced append-only ledger rows, multi-process concurrency control, or production reconciliation.

For that reason:
- Do not treat this branch as production-ready or enable live financial settlement.
- Provider callbacks still must be authenticated and reconciled before settlement.
- Keep the application to one backend process while this snapshot architecture is in use.
- The next migration should move wallet, transaction, idempotency and ledger writes into normalized SQL tables and one SQL transaction per financial command.
