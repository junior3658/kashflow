import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

export type FinancialDatabase = InstanceType<typeof Database>;

export const FINANCIAL_SCHEMA_VERSION = 1;

const schema = String.raw\`
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS wallets (
  id TEXT PRIMARY KEY,
  owner_type TEXT NOT NULL CHECK (owner_type IN ('USER', 'ORGANIZATION')),
  owner_id TEXT NOT NULL,
  wallet_type TEXT NOT NULL CHECK (wallet_type IN ('PERSONAL', 'BUSINESS', 'ESCROW', 'SETTLEMENT')),
  currency TEXT NOT NULL CHECK (currency IN ('USD', 'EUR', 'CDF')),
  name TEXT NOT NULL,
  internal_balance_minor INTEGER NOT NULL DEFAULT 0
    CHECK (typeof(internal_balance_minor) = 'integer' AND internal_balance_minor BETWEEN 0 AND 9007199254740991),
  provider_balance_minor INTEGER
    CHECK (provider_balance_minor IS NULL OR (typeof(provider_balance_minor) = 'integer' AND provider_balance_minor BETWEEN 0 AND 9007199254740991)),
  provider_balance_status TEXT NOT NULL DEFAULT 'NOT_SYNCED'
    CHECK (provider_balance_status IN ('NOT_SYNCED', 'VERIFIED', 'STALE')),
  pending_debits_minor INTEGER NOT NULL DEFAULT 0
    CHECK (typeof(pending_debits_minor) = 'integer' AND pending_debits_minor BETWEEN 0 AND 9007199254740991),
  pending_credits_minor INTEGER NOT NULL DEFAULT 0
    CHECK (typeof(pending_credits_minor) = 'integer' AND pending_credits_minor BETWEEN 0 AND 9007199254740991),
  is_simulated INTEGER NOT NULL DEFAULT 0 CHECK (is_simulated IN (0, 1)),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'FROZEN')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (id, currency),
  CHECK (provider_balance_status <> 'VERIFIED' OR provider_balance_minor IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_wallets_owner ON wallets(owner_type, owner_id, currency);

CREATE TABLE IF NOT EXISTS ledger_accounts (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE')),
  currency TEXT NOT NULL CHECK (currency IN ('USD', 'EUR', 'CDF')),
  wallet_id TEXT,
  balance_minor INTEGER NOT NULL DEFAULT 0
    CHECK (typeof(balance_minor) = 'integer' AND balance_minor BETWEEN 0 AND 9007199254740991),
  created_at TEXT NOT NULL,
  UNIQUE (id, currency),
  UNIQUE (wallet_id, currency),
  FOREIGN KEY (wallet_id, currency) REFERENCES wallets(id, currency)
);

CREATE INDEX IF NOT EXISTS idx_ledger_accounts_code ON ledger_accounts(code, currency);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  org_id TEXT,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN (
    'TRANSFER', 'PAYPAL_PAYMENT', 'SHWARY_ENCASHMENT', 'SHWARY_PAYOUT',
    'EXCHANGE', 'CRYPTO_SIM_BUY', 'CRYPTO_SIM_SELL', 'REFUND'
  )),
  status TEXT NOT NULL CHECK (status IN (
    'CREATED', 'PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'REFUNDED'
  )),
  source_wallet_id TEXT NOT NULL,
  destination_wallet_id TEXT,
  amount_minor INTEGER NOT NULL
    CHECK (typeof(amount_minor) = 'integer' AND amount_minor BETWEEN 1 AND 9007199254740991),
  fee_minor INTEGER NOT NULL DEFAULT 0
    CHECK (typeof(fee_minor) = 'integer' AND fee_minor BETWEEN 0 AND 9007199254740991),
  currency TEXT NOT NULL CHECK (currency IN ('USD', 'EUR', 'CDF')),
  provider TEXT NOT NULL CHECK (provider IN ('INTERNAL', 'PAYPAL', 'SHWARY', 'EXCHANGE_DESK', 'CRYPTO_SIM')),
  provider_reference TEXT,
  description TEXT NOT NULL,
  metadata_json TEXT,
  failure_reason TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (source_wallet_id, currency) REFERENCES wallets(id, currency),
  FOREIGN KEY (destination_wallet_id, currency) REFERENCES wallets(id, currency),
  UNIQUE (provider, provider_reference),
  CHECK (amount_minor <= 9007199254740991 - fee_minor)
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_created ON transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_org_created ON transactions(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status, updated_at);

CREATE TABLE IF NOT EXISTS idempotency_keys (
  user_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL CHECK (length(idempotency_key) BETWEEN 1 AND 128),
  request_sha256 TEXT NOT NULL CHECK (length(request_sha256) = 64),
  transaction_id TEXT NOT NULL UNIQUE REFERENCES transactions(id),
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS ledger_batches (
  id TEXT PRIMARY KEY,
  transaction_id TEXT NOT NULL REFERENCES transactions(id),
  batch_type TEXT NOT NULL CHECK (batch_type IN ('POSTING', 'REVERSAL')),
  currency TEXT NOT NULL CHECK (currency IN ('USD', 'EUR', 'CDF')),
  total_debits_minor INTEGER NOT NULL
    CHECK (typeof(total_debits_minor) = 'integer' AND total_debits_minor > 0 AND total_debits_minor <= 9007199254740991),
  total_credits_minor INTEGER NOT NULL
    CHECK (typeof(total_credits_minor) = 'integer' AND total_credits_minor > 0 AND total_credits_minor <= 9007199254740991),
  reversal_of_batch_id TEXT REFERENCES ledger_batches(id),
  created_at TEXT NOT NULL,
  posted_at TEXT,
  UNIQUE (transaction_id, batch_type),
  UNIQUE (id, currency),
  CHECK (total_debits_minor = total_credits_minor),
  CHECK (
    (batch_type = 'POSTING' AND reversal_of_batch_id IS NULL)
    OR (batch_type = 'REVERSAL' AND reversal_of_batch_id IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS ledger_entries (
  id TEXT PRIMARY KEY,
  batch_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  currency TEXT NOT NULL CHECK (currency IN ('USD', 'EUR', 'CDF')),
  entry_type TEXT NOT NULL CHECK (entry_type IN ('DEBIT', 'CREDIT')),
  amount_minor INTEGER NOT NULL
    CHECK (typeof(amount_minor) = 'integer' AND amount_minor BETWEEN 1 AND 9007199254740991),
  description TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (batch_id, currency) REFERENCES ledger_batches(id, currency),
  FOREIGN KEY (account_id, currency) REFERENCES ledger_accounts(id, currency)
);

CREATE INDEX IF NOT EXISTS idx_ledger_entries_batch ON ledger_entries(batch_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_account ON ledger_entries(account_id, currency);

CREATE TABLE IF NOT EXISTS wallet_reservations (
  transaction_id TEXT PRIMARY KEY REFERENCES transactions(id),
  wallet_id TEXT NOT NULL,
  currency TEXT NOT NULL,
  amount_minor INTEGER NOT NULL
    CHECK (typeof(amount_minor) = 'integer' AND amount_minor BETWEEN 1 AND 9007199254740991),
  status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'CONSUMED', 'RELEASED')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (wallet_id, currency) REFERENCES wallets(id, currency)
);

CREATE TABLE IF NOT EXISTS provider_events (
  id TEXT PRIMARY KEY,
  transaction_id TEXT NOT NULL REFERENCES transactions(id),
  provider TEXT NOT NULL CHECK (provider IN ('PAYPAL', 'SHWARY')),
  provider_event_id TEXT NOT NULL,
  provider_reference TEXT,
  payload_sha256 TEXT NOT NULL CHECK (length(payload_sha256) = 64),
  verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED'
    CHECK (verification_status IN ('UNVERIFIED', 'VERIFIED', 'REJECTED')),
  reconciliation_status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (reconciliation_status IN ('PENDING', 'MATCHED', 'MISMATCHED')),
  received_at TEXT NOT NULL,
  verified_at TEXT,
  reconciled_at TEXT,
  UNIQUE (provider, provider_event_id),
  CHECK (verification_status <> 'VERIFIED' OR verified_at IS NOT NULL),
  CHECK (reconciliation_status <> 'MATCHED' OR (verification_status = 'VERIFIED' AND reconciled_at IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS idx_provider_events_transaction ON provider_events(transaction_id, provider);

CREATE TRIGGER IF NOT EXISTS trg_wallet_identity_immutable
BEFORE UPDATE OF owner_type, owner_id, wallet_type, currency ON wallets
BEGIN
  SELECT RAISE(ABORT, 'wallet ownership and currency are immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_ledger_account_identity_immutable
BEFORE UPDATE OF code, name, account_type, currency, wallet_id ON ledger_accounts
BEGIN
  SELECT RAISE(ABORT, 'ledger account identity is immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_idempotency_keys_no_update
BEFORE UPDATE ON idempotency_keys
BEGIN
  SELECT RAISE(ABORT, 'idempotency records are immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_idempotency_keys_no_delete
BEFORE DELETE ON idempotency_keys
BEGIN
  SELECT RAISE(ABORT, 'idempotency records are immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_transactions_provider_reference_immutable
BEFORE UPDATE OF provider_reference ON transactions
WHEN OLD.provider_reference IS NOT NULL AND NEW.provider_reference <> OLD.provider_reference
BEGIN
  SELECT RAISE(ABORT, 'provider reference is immutable once assigned');
END;

CREATE TRIGGER IF NOT EXISTS trg_provider_events_initial_state
BEFORE INSERT ON provider_events
WHEN NEW.verification_status <> 'UNVERIFIED' OR NEW.reconciliation_status <> 'PENDING'
BEGIN
  SELECT RAISE(ABORT, 'provider events must start unverified and unreconciled');
END;

CREATE TRIGGER IF NOT EXISTS trg_provider_events_verification_monotonic
BEFORE UPDATE OF verification_status ON provider_events
WHEN OLD.verification_status IN ('VERIFIED', 'REJECTED')
  AND NEW.verification_status <> OLD.verification_status
BEGIN
  SELECT RAISE(ABORT, 'provider verification result is immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_provider_events_reconciliation_monotonic
BEFORE UPDATE OF reconciliation_status ON provider_events
WHEN OLD.reconciliation_status IN ('MATCHED', 'MISMATCHED')
  AND NEW.reconciliation_status <> OLD.reconciliation_status
BEGIN
  SELECT RAISE(ABORT, 'provider reconciliation result is immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_ledger_batches_insert_unposted
BEFORE INSERT ON ledger_batches
WHEN NEW.posted_at IS NOT NULL
BEGIN
  SELECT RAISE(ABORT, 'ledger batches must be posted through the validated transition');
END;

CREATE TRIGGER IF NOT EXISTS trg_ledger_batches_identity_immutable
BEFORE UPDATE OF id, transaction_id, batch_type, currency, total_debits_minor,
  total_credits_minor, reversal_of_batch_id, created_at ON ledger_batches
BEGIN
  SELECT RAISE(ABORT, 'ledger batch identity and totals are immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_reservations_identity_immutable
BEFORE UPDATE OF transaction_id, wallet_id, currency, amount_minor, created_at ON wallet_reservations
BEGIN
  SELECT RAISE(ABORT, 'wallet reservation identity is immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_transactions_validate_tenant_insert
BEFORE INSERT ON transactions
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM wallets w
    WHERE w.id = NEW.source_wallet_id
      AND w.currency = NEW.currency
      AND w.status = 'ACTIVE'
      AND (
        (w.owner_type = 'USER' AND w.owner_id = NEW.user_id)
        OR (w.owner_type = 'ORGANIZATION' AND NEW.org_id IS NOT NULL AND w.owner_id = NEW.org_id)
      )
  ) THEN RAISE(ABORT, 'source wallet is outside the transaction tenant or inactive') END;

  SELECT CASE WHEN NEW.destination_wallet_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM wallets w
    WHERE w.id = NEW.destination_wallet_id
      AND w.currency = NEW.currency
      AND w.status = 'ACTIVE'
      AND (
        (w.owner_type = 'USER' AND w.owner_id = NEW.user_id)
        OR (w.owner_type = 'ORGANIZATION' AND NEW.org_id IS NOT NULL AND w.owner_id = NEW.org_id)
      )
  ) THEN RAISE(ABORT, 'destination wallet is outside the transaction tenant or inactive') END;
END;

CREATE TRIGGER IF NOT EXISTS trg_transactions_financial_fields_immutable
BEFORE UPDATE OF user_id, org_id, transaction_type, source_wallet_id, destination_wallet_id,
  amount_minor, fee_minor, currency, provider ON transactions
BEGIN
  SELECT RAISE(ABORT, 'transaction financial intent is immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_transactions_status_transition
BEFORE UPDATE OF status ON transactions
WHEN NOT (
  NEW.status = OLD.status
  OR (OLD.status = 'CREATED' AND NEW.status IN ('PENDING', 'FAILED', 'CANCELLED'))
  OR (OLD.status = 'PENDING' AND NEW.status IN ('PROCESSING', 'FAILED', 'CANCELLED'))
  OR (OLD.status = 'PROCESSING' AND NEW.status IN ('SUCCEEDED', 'FAILED'))
  OR (OLD.status = 'SUCCEEDED' AND NEW.status = 'REFUNDED')
)
BEGIN
  SELECT RAISE(ABORT, 'invalid transaction status transition');
END;

CREATE TRIGGER IF NOT EXISTS trg_transactions_require_posted_ledger
BEFORE UPDATE OF status ON transactions
WHEN NEW.status = 'SUCCEEDED' AND NOT EXISTS (
  SELECT 1 FROM ledger_batches b
  WHERE b.transaction_id = NEW.id AND b.batch_type = 'POSTING' AND b.posted_at IS NOT NULL
)
BEGIN
  SELECT RAISE(ABORT, 'transaction cannot succeed without a posted ledger batch');
END;

CREATE TRIGGER IF NOT EXISTS trg_transactions_require_reversal
BEFORE UPDATE OF status ON transactions
WHEN NEW.status = 'REFUNDED' AND NOT EXISTS (
  SELECT 1 FROM ledger_batches b
  WHERE b.transaction_id = NEW.id AND b.batch_type = 'REVERSAL' AND b.posted_at IS NOT NULL
)
BEGIN
  SELECT RAISE(ABORT, 'transaction cannot be refunded without a posted reversal batch');
END;

CREATE TRIGGER IF NOT EXISTS trg_transactions_release_reservation
AFTER UPDATE OF status ON transactions
WHEN NEW.status IN ('FAILED', 'CANCELLED')
BEGIN
  UPDATE wallet_reservations
  SET status = 'RELEASED', updated_at = NEW.updated_at
  WHERE transaction_id = NEW.id AND status = 'ACTIVE';
END;

CREATE TRIGGER IF NOT EXISTS trg_reservations_validate_insert
BEFORE INSERT ON wallet_reservations
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM transactions t
    WHERE t.id = NEW.transaction_id
      AND t.status = 'PENDING'
      AND t.source_wallet_id = NEW.wallet_id
      AND t.currency = NEW.currency
      AND NEW.amount_minor = t.amount_minor + t.fee_minor
  ) THEN RAISE(ABORT, 'reservation must match a pending transaction source and total') END;
END;

CREATE TRIGGER IF NOT EXISTS trg_reservations_apply_insert
AFTER INSERT ON wallet_reservations
BEGIN
  UPDATE wallets
  SET pending_debits_minor = pending_debits_minor + NEW.amount_minor,
      updated_at = NEW.updated_at
  WHERE id = NEW.wallet_id AND currency = NEW.currency;
END;

CREATE TRIGGER IF NOT EXISTS trg_reservations_status_transition
BEFORE UPDATE OF status ON wallet_reservations
WHEN NOT (
  NEW.status = OLD.status
  OR (OLD.status = 'ACTIVE' AND NEW.status IN ('CONSUMED', 'RELEASED'))
)
BEGIN
  SELECT RAISE(ABORT, 'invalid reservation status transition');
END;

CREATE TRIGGER IF NOT EXISTS trg_reservations_apply_release
AFTER UPDATE OF status ON wallet_reservations
WHEN OLD.status = 'ACTIVE' AND NEW.status IN ('CONSUMED', 'RELEASED')
BEGIN
  UPDATE wallets
  SET pending_debits_minor = pending_debits_minor - OLD.amount_minor,
      updated_at = NEW.updated_at
  WHERE id = OLD.wallet_id AND currency = OLD.currency;
END;

CREATE TRIGGER IF NOT EXISTS trg_provider_events_match_transaction
BEFORE INSERT ON provider_events
WHEN NEW.provider <> (SELECT provider FROM transactions WHERE id = NEW.transaction_id)
BEGIN
  SELECT RAISE(ABORT, 'provider event does not match transaction provider');
END;

CREATE TRIGGER IF NOT EXISTS trg_provider_events_identity_immutable
BEFORE UPDATE OF transaction_id, provider, provider_event_id, provider_reference, payload_sha256, received_at
ON provider_events
BEGIN
  SELECT RAISE(ABORT, 'provider event identity and payload hash are immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_ledger_entries_insert_unposted
BEFORE INSERT ON ledger_entries
WHEN (SELECT posted_at FROM ledger_batches WHERE id = NEW.batch_id) IS NOT NULL
BEGIN
  SELECT RAISE(ABORT, 'cannot append entries to a posted ledger batch');
END;

CREATE TRIGGER IF NOT EXISTS trg_ledger_entries_no_update
BEFORE UPDATE ON ledger_entries
BEGIN
  SELECT RAISE(ABORT, 'ledger entries are immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_ledger_entries_no_delete
BEFORE DELETE ON ledger_entries
BEGIN
  SELECT RAISE(ABORT, 'ledger entries are immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_ledger_batch_validate_post
BEFORE UPDATE OF posted_at ON ledger_batches
WHEN OLD.posted_at IS NULL AND NEW.posted_at IS NOT NULL
BEGIN
  SELECT CASE WHEN (
    SELECT COUNT(*) FROM ledger_entries WHERE batch_id = NEW.id
  ) < 2 THEN RAISE(ABORT, 'a ledger batch requires at least two entries') END;

  SELECT CASE WHEN (
    SELECT COALESCE(SUM(CASE WHEN entry_type = 'DEBIT' THEN amount_minor ELSE 0 END), 0)
    FROM ledger_entries WHERE batch_id = NEW.id
  ) <> NEW.total_debits_minor THEN RAISE(ABORT, 'ledger debit total does not match entries') END;

  SELECT CASE WHEN (
    SELECT COALESCE(SUM(CASE WHEN entry_type = 'CREDIT' THEN amount_minor ELSE 0 END), 0)
    FROM ledger_entries WHERE batch_id = NEW.id
  ) <> NEW.total_credits_minor THEN RAISE(ABORT, 'ledger credit total does not match entries') END;

  SELECT CASE WHEN NEW.batch_type = 'POSTING' AND (
    SELECT status FROM transactions WHERE id = NEW.transaction_id
  ) <> 'PROCESSING' THEN RAISE(ABORT, 'posting requires a processing transaction') END;

  SELECT CASE WHEN NEW.batch_type = 'REVERSAL' AND (
    SELECT status FROM transactions WHERE id = NEW.transaction_id
  ) <> 'SUCCEEDED' THEN RAISE(ABORT, 'reversal requires a succeeded transaction') END;

  SELECT CASE WHEN NEW.batch_type = 'REVERSAL' AND NOT EXISTS (
    SELECT 1 FROM ledger_batches original
    WHERE original.id = NEW.reversal_of_batch_id
      AND original.transaction_id = NEW.transaction_id
      AND original.batch_type = 'POSTING'
      AND original.posted_at IS NOT NULL
  ) THEN RAISE(ABORT, 'reversal must reference the posted original batch') END;

  SELECT CASE WHEN (
    SELECT provider FROM transactions WHERE id = NEW.transaction_id
  ) <> 'INTERNAL' AND NEW.batch_type = 'POSTING' AND NOT EXISTS (
    SELECT 1 FROM provider_events e
    WHERE e.transaction_id = NEW.transaction_id
      AND e.provider = (SELECT provider FROM transactions WHERE id = NEW.transaction_id)
      AND e.verification_status = 'VERIFIED'
      AND e.reconciliation_status = 'MATCHED'
  ) THEN RAISE(ABORT, 'external settlement requires verified and reconciled provider evidence') END;
END;

CREATE TRIGGER IF NOT EXISTS trg_ledger_batches_no_update_after_post
BEFORE UPDATE ON ledger_batches
WHEN OLD.posted_at IS NOT NULL
BEGIN
  SELECT RAISE(ABORT, 'posted ledger batches are immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_ledger_batches_no_delete_after_post
BEFORE DELETE ON ledger_batches
WHEN OLD.posted_at IS NOT NULL
BEGIN
  SELECT RAISE(ABORT, 'posted ledger batches are immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_ledger_batches_apply_posting
AFTER UPDATE OF posted_at ON ledger_batches
WHEN OLD.posted_at IS NULL AND NEW.posted_at IS NOT NULL
BEGIN
  UPDATE ledger_accounts
  SET balance_minor = balance_minor + (
    SELECT CASE
      WHEN ledger_accounts.account_type IN ('ASSET', 'EXPENSE') THEN
        SUM(CASE WHEN e.entry_type = 'DEBIT' THEN e.amount_minor ELSE -e.amount_minor END)
      ELSE
        SUM(CASE WHEN e.entry_type = 'CREDIT' THEN e.amount_minor ELSE -e.amount_minor END)
    END
    FROM ledger_entries e
    WHERE e.batch_id = NEW.id AND e.account_id = ledger_accounts.id
  )
  WHERE id IN (SELECT account_id FROM ledger_entries WHERE batch_id = NEW.id);

  UPDATE wallets
  SET internal_balance_minor = internal_balance_minor + (
    SELECT CASE
      WHEN a.account_type IN ('ASSET', 'EXPENSE') THEN
        SUM(CASE WHEN e.entry_type = 'DEBIT' THEN e.amount_minor ELSE -e.amount_minor END)
      ELSE
        SUM(CASE WHEN e.entry_type = 'CREDIT' THEN e.amount_minor ELSE -e.amount_minor END)
    END
    FROM ledger_accounts a
    JOIN ledger_entries e ON e.account_id = a.id
    WHERE e.batch_id = NEW.id AND a.wallet_id = wallets.id
  ),
  updated_at = NEW.posted_at
  WHERE id IN (
    SELECT a.wallet_id
    FROM ledger_accounts a
    JOIN ledger_entries e ON e.account_id = a.id
    WHERE e.batch_id = NEW.id AND a.wallet_id IS NOT NULL
  );

  UPDATE wallet_reservations
  SET status = 'CONSUMED', updated_at = NEW.posted_at
  WHERE transaction_id = NEW.transaction_id
    AND status = 'ACTIVE'
    AND NEW.batch_type = 'POSTING';
END;
\`;

export function openFinancialDatabase(
  filename = process.env.FINANCIAL_DATABASE_PATH || 'data/kashflow-financial.sqlite',
): FinancialDatabase {
  if (filename !== ':memory:') {
    fs.mkdirSync(path.dirname(path.resolve(filename)), { recursive: true });
  }

  const sql = new Database(filename);
  sql.pragma('foreign_keys = ON');
  sql.pragma('busy_timeout = 5000');
  sql.pragma('journal_mode = WAL');

  const currentVersion = Number(sql.pragma('user_version', { simple: true }));
  if (currentVersion > FINANCIAL_SCHEMA_VERSION) {
    sql.close();
    throw new Error(
      \`Financial database schema version \${currentVersion} is newer than this application supports (\${FINANCIAL_SCHEMA_VERSION}).\`,
    );
  }

  sql.exec('BEGIN IMMEDIATE');
  try {
    sql.exec(schema);
    sql.prepare('INSERT OR IGNORE INTO schema_migrations(version, applied_at) VALUES(?, ?)').run(
      FINANCIAL_SCHEMA_VERSION,
      new Date().toISOString(),
    );
    sql.exec(\`PRAGMA user_version = \${FINANCIAL_SCHEMA_VERSION}\`);
    sql.exec('COMMIT');
  } catch (error) {
    sql.exec('ROLLBACK');
    sql.close();
    throw error;
  }

  return sql;
}
