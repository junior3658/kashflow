import assert from 'node:assert/strict';
import { openFinancialDatabase } from '../src/backend/financial/schema';

export function testFinancialSqliteSchema() {
  console.log('--- RUNNING SQLITE FINANCIAL SCHEMA TESTS ---');
  const sql = openFinancialDatabase(':memory:');
  const now = new Date().toISOString();
  assert.equal(Number(sql.pragma('user_version', { simple: true })), 4);

  const addWallet = (id: string, ownerId: string, balance: number) =>
    sql.prepare("INSERT INTO wallets (id, owner_type, owner_id, wallet_type, currency, name, internal_balance_minor, created_at, updated_at) VALUES (?, 'USER', ?, 'PERSONAL', 'USD', ?, ?, ?, ?)")
      .run(id, ownerId, id, balance, now, now);

  const addAccount = (id: string, code: string, type: 'ASSET' | 'LIABILITY', walletId: string | null, balance: number) =>
    sql.prepare('INSERT INTO ledger_accounts (id, code, name, account_type, currency, wallet_id, balance_minor, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(id, code, id, type, 'USD', walletId, balance, now);

  const addTransaction = (input: {
    id: string;
    userId?: string;
    provider?: 'INTERNAL' | 'PAYPAL' | 'SHWARY';
    orgId?: string;
    sourceWalletId?: string;
    destinationWalletId?: string | null;
    amount?: number;
    fee?: number;
  }) => sql.prepare("INSERT INTO transactions (id, user_id, org_id, transaction_type, status, source_wallet_id, destination_wallet_id, amount_minor, fee_minor, currency, provider, description, created_at, updated_at) VALUES (?, ?, ?, 'TRANSFER', 'CREATED', ?, ?, ?, ?, 'USD', ?, ?, ?, ?)")
    .run(
      input.id,
      input.userId || 'user-a',
      input.orgId || null,
      input.sourceWalletId || 'wallet-a',
      input.destinationWalletId === undefined ? 'wallet-b' : input.destinationWalletId,
      input.amount ?? 500,
      input.fee ?? 0,
      input.provider || 'INTERNAL',
      input.id,
      now,
      now,
    );

  const addBatch = (id: string, transactionId: string, batchType: 'POSTING' | 'REVERSAL', amount: number, reversalOfBatchId: string | null = null) =>
    sql.prepare('INSERT INTO ledger_batches (id, transaction_id, batch_type, currency, total_debits_minor, total_credits_minor, reversal_of_batch_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(id, transactionId, batchType, 'USD', amount, amount, reversalOfBatchId, now);

  const addEntry = (id: string, batchId: string, accountId: string, type: 'DEBIT' | 'CREDIT', amount: number) =>
    sql.prepare('INSERT INTO ledger_entries (id, batch_id, account_id, currency, entry_type, amount_minor, description, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(id, batchId, accountId, 'USD', type, amount, id, now);

  try {
    addWallet('wallet-a', 'user-a', 10000);
    addWallet('wallet-b', 'user-a', 0);
    addWallet('wallet-other', 'user-b', 10000);
    addAccount('account-wallet-a', '2010-A', 'LIABILITY', 'wallet-a', 10000);
    addAccount('account-wallet-b', '2010-B', 'LIABILITY', 'wallet-b', 0);
    addAccount('account-wallet-other', '2010-C', 'LIABILITY', 'wallet-other', 10000);
    addAccount('account-cash', '1010', 'ASSET', null, 100000);

    sql.prepare('INSERT INTO financial_organizations(id, status, created_at) VALUES(?, ?, ?)').run('org-a', 'ACTIVE', now);
    sql.prepare('INSERT INTO organization_memberships(organization_id, user_id, role, status, can_transact, created_at) VALUES(?, ?, ?, ?, ?, ?)')
      .run('org-a', 'user-a', 'OWNER', 'ACTIVE', 1, now);
    sql.prepare("INSERT INTO wallets (id, owner_type, owner_id, wallet_type, currency, name, internal_balance_minor, created_at, updated_at) VALUES ('wallet-org', 'ORGANIZATION', 'org-a', 'BUSINESS', 'USD', 'Org wallet', 10000, ?, ?)")
      .run(now, now);
    addAccount('account-wallet-org', '2010-ORG', 'LIABILITY', 'wallet-org', 10000);

    assert.throws(
      () => addTransaction({ id: 'tx-org-impersonation', userId: 'user-b', orgId: 'org-a', sourceWalletId: 'wallet-org', destinationWalletId: null }),
      /active organization membership/,
    );
    addTransaction({ id: 'tx-org-member', userId: 'user-a', orgId: 'org-a', sourceWalletId: 'wallet-org', destinationWalletId: null });
    sql.prepare("INSERT INTO organization_memberships(organization_id, user_id, role, status, can_transact, created_at) VALUES('org-a', 'user-c', 'EMPLOYEE', 'ACTIVE', 0, ?)").run(now);
    assert.throws(
      () => addTransaction({ id: 'tx-org-employee-denied', userId: 'user-c', orgId: 'org-a', sourceWalletId: 'wallet-org', destinationWalletId: null }),
      /active organization membership/,
    );
    sql.prepare("UPDATE organization_memberships SET can_transact = 1 WHERE organization_id = 'org-a' AND user_id = 'user-c'").run();
    addTransaction({ id: 'tx-org-employee-authorized', userId: 'user-c', orgId: 'org-a', sourceWalletId: 'wallet-org', destinationWalletId: null });
    sql.prepare("UPDATE organization_memberships SET status = 'REVOKED' WHERE organization_id = 'org-a' AND user_id = 'user-a'").run();
    assert.throws(
      () => addTransaction({ id: 'tx-org-revoked', userId: 'user-a', orgId: 'org-a', sourceWalletId: 'wallet-org', destinationWalletId: null }),
      /active organization membership/,
    );
    assert.throws(() => sql.prepare(`
      UPDATE organization_memberships SET status = 'ACTIVE', can_transact = 1
      WHERE organization_id = 'org-a' AND user_id = 'user-a'
    `).run(), /revoked membership cannot be reactivated/);
    assert.throws(() => sql.prepare(`
      DELETE FROM organization_memberships WHERE organization_id = 'org-a' AND user_id = 'user-a'
    `).run(), /cannot be deleted/);
    console.log('✓ Organization wallets require active membership and explicit transaction permission.');

    assert.throws(
      () => addTransaction({ id: 'tx-cross-tenant', sourceWalletId: 'wallet-other' }),
      /outside the transaction tenant/,
    );
    console.log('✓ SQL tenant trigger rejects another user wallet.');

    addTransaction({ id: 'tx-overdraw', destinationWalletId: null, amount: 10001 });
    sql.prepare("UPDATE transactions SET status = 'PENDING' WHERE id = 'tx-overdraw'").run();
    assert.throws(
      () => sql.prepare("INSERT INTO wallet_reservations (transaction_id, wallet_id, currency, amount_minor, status, created_at, updated_at) VALUES ('tx-overdraw', 'wallet-a', 'USD', 10001, 'ACTIVE', ?, ?)").run(now, now),
      /insufficient available wallet balance/,
    );
    sql.prepare("UPDATE transactions SET status = 'FAILED' WHERE id = 'tx-overdraw'").run();
    console.log('✓ SQLite refuses reservations above the available wallet balance.');

    addTransaction({ id: 'tx-internal' });
    sql.prepare("UPDATE transactions SET status = 'PENDING' WHERE id = 'tx-internal'").run();
    sql.prepare("INSERT INTO wallet_reservations (transaction_id, wallet_id, currency, amount_minor, status, created_at, updated_at) VALUES ('tx-internal', 'wallet-a', 'USD', 500, 'ACTIVE', ?, ?)").run(now, now);
    sql.prepare("UPDATE transactions SET status = 'PROCESSING' WHERE id = 'tx-internal'").run();
    addBatch('batch-internal', 'tx-internal', 'POSTING', 500);
    addEntry('entry-internal-debit', 'batch-internal', 'account-wallet-a', 'DEBIT', 500);
    addEntry('entry-internal-credit', 'batch-internal', 'account-wallet-b', 'CREDIT', 500);
    sql.prepare("UPDATE ledger_batches SET posted_at = ? WHERE id = 'batch-internal'").run(now);
    sql.prepare("UPDATE transactions SET status = 'SUCCEEDED' WHERE id = 'tx-internal'").run();

    const balances = sql.prepare("SELECT id, internal_balance_minor, pending_debits_minor FROM wallets WHERE id IN ('wallet-a', 'wallet-b') ORDER BY id").all() as Array<{ id: string; internal_balance_minor: number; pending_debits_minor: number }>;
    assert.deepEqual(balances, [
      { id: 'wallet-a', internal_balance_minor: 9500, pending_debits_minor: 0 },
      { id: 'wallet-b', internal_balance_minor: 500, pending_debits_minor: 0 },
    ]);
    assert.throws(
      () => sql.prepare("UPDATE ledger_entries SET description = 'tampered' WHERE id = 'entry-internal-debit'").run(),
      /immutable/,
    );
    assert.throws(
      () => sql.prepare("UPDATE transactions SET amount_minor = 1 WHERE id = 'tx-internal'").run(),
      /financial intent is immutable/,
    );
    console.log('✓ Balanced posting updates wallet projections and consumes reservations.');
    console.log('✓ Posted entries and transaction financial intent are immutable.');

    addBatch('batch-internal-reversal', 'tx-internal', 'REVERSAL', 500, 'batch-internal');
    addEntry('entry-reversal-debit', 'batch-internal-reversal', 'account-wallet-b', 'DEBIT', 500);
    addEntry('entry-reversal-credit', 'batch-internal-reversal', 'account-wallet-a', 'CREDIT', 500);
    sql.prepare("UPDATE ledger_batches SET posted_at = ? WHERE id = 'batch-internal-reversal'").run(now);
    sql.prepare("UPDATE transactions SET status = 'REFUNDED' WHERE id = 'tx-internal'").run();
    const refunded = sql.prepare("SELECT internal_balance_minor FROM wallets WHERE id = 'wallet-a'").get() as { internal_balance_minor: number };
    assert.equal(refunded.internal_balance_minor, 10000);
    console.log('✓ REFUNDED requires a posted inverse batch.');

    addTransaction({ id: 'tx-reversal-check', amount: 100 });
    sql.prepare("UPDATE transactions SET status = 'PENDING' WHERE id = 'tx-reversal-check'").run();
    sql.prepare("INSERT INTO wallet_reservations (transaction_id, wallet_id, currency, amount_minor, status, created_at, updated_at) VALUES ('tx-reversal-check', 'wallet-a', 'USD', 100, 'ACTIVE', ?, ?)").run(now, now);
    sql.prepare("UPDATE transactions SET status = 'PROCESSING' WHERE id = 'tx-reversal-check'").run();
    addBatch('batch-reversal-check', 'tx-reversal-check', 'POSTING', 100);
    addEntry('entry-reversal-check-debit', 'batch-reversal-check', 'account-wallet-a', 'DEBIT', 100);
    addEntry('entry-reversal-check-credit', 'batch-reversal-check', 'account-wallet-b', 'CREDIT', 100);
    sql.prepare("UPDATE ledger_batches SET posted_at = ? WHERE id = 'batch-reversal-check'").run(now);
    sql.prepare("UPDATE transactions SET status = 'SUCCEEDED' WHERE id = 'tx-reversal-check'").run();
    addBatch('batch-reversal-check-invalid', 'tx-reversal-check', 'REVERSAL', 99, 'batch-reversal-check');
    addEntry('entry-reversal-check-invalid-debit', 'batch-reversal-check-invalid', 'account-wallet-b', 'DEBIT', 99);
    addEntry('entry-reversal-check-invalid-credit', 'batch-reversal-check-invalid', 'account-wallet-a', 'CREDIT', 99);
    assert.throws(
      () => sql.prepare("UPDATE ledger_batches SET posted_at = ? WHERE id = 'batch-reversal-check-invalid'").run(now),
      /exactly invert the original posted batch/,
    );
    console.log('✓ A reversal must exactly invert every original ledger line.');

    addTransaction({ id: 'tx-unbalanced', destinationWalletId: null, amount: 100 });
    sql.prepare("UPDATE transactions SET status = 'PENDING' WHERE id = 'tx-unbalanced'").run();
    sql.prepare("INSERT INTO wallet_reservations (transaction_id, wallet_id, currency, amount_minor, status, created_at, updated_at) VALUES ('tx-unbalanced', 'wallet-a', 'USD', 100, 'ACTIVE', ?, ?)").run(now, now);
    sql.prepare("UPDATE transactions SET status = 'PROCESSING' WHERE id = 'tx-unbalanced'").run();
    addBatch('batch-unbalanced', 'tx-unbalanced', 'POSTING', 100);
    addEntry('entry-unbalanced-debit', 'batch-unbalanced', 'account-wallet-a', 'DEBIT', 100);
    addEntry('entry-unbalanced-credit', 'batch-unbalanced', 'account-cash', 'CREDIT', 99);
    assert.throws(
      () => sql.prepare("UPDATE ledger_batches SET posted_at = ? WHERE id = 'batch-unbalanced'").run(now),
      /ledger credit total does not match entries/,
    );
    console.log('✓ SQLite refuses to post unbalanced entry totals.');

    addTransaction({ id: 'tx-shwary', provider: 'SHWARY', destinationWalletId: null, amount: 250 });
    sql.prepare("UPDATE transactions SET status = 'PENDING' WHERE id = 'tx-shwary'").run();
    sql.prepare("INSERT INTO wallet_reservations (transaction_id, wallet_id, currency, amount_minor, status, created_at, updated_at) VALUES ('tx-shwary', 'wallet-a', 'USD', 250, 'ACTIVE', ?, ?)").run(now, now);
    sql.prepare("UPDATE transactions SET status = 'PROCESSING' WHERE id = 'tx-shwary'").run();
    addBatch('batch-shwary', 'tx-shwary', 'POSTING', 250);
    addEntry('entry-shwary-debit', 'batch-shwary', 'account-wallet-a', 'DEBIT', 250);
    addEntry('entry-shwary-credit', 'batch-shwary', 'account-cash', 'CREDIT', 250);
    assert.throws(
      () => sql.prepare("UPDATE ledger_batches SET posted_at = ? WHERE id = 'batch-shwary'").run(now),
      /provider evidence amount, currency and confirmed status|verified and reconciled provider evidence/,
    );
    assert.throws(
      () => sql.prepare("INSERT INTO provider_events (id, transaction_id, provider, provider_event_id, amount_minor, currency, normalized_status, payload_sha256, received_at) VALUES ('event-shwary-mismatch', 'tx-shwary', 'SHWARY', 'evt-mismatch', 249, 'USD', 'CONFIRMED', ?, ?)").run('b'.repeat(64), now),
      /does not match transaction provider, amount or currency/,
    );
    sql.prepare("INSERT INTO provider_events (id, transaction_id, provider, provider_event_id, amount_minor, currency, normalized_status, payload_sha256, received_at) VALUES ('event-shwary', 'tx-shwary', 'SHWARY', 'evt-001', 250, 'USD', 'CONFIRMED', ?, ?)").run('a'.repeat(64), now);
    sql.prepare("UPDATE provider_events SET verification_status = 'VERIFIED', verified_at = ? WHERE id = 'event-shwary'").run(now);
    assert.throws(
      () => sql.prepare("UPDATE provider_events SET amount_minor = 249 WHERE id = 'event-shwary'").run(),
      /amount, currency and normalized status are immutable/,
    );
    sql.prepare("UPDATE provider_events SET reconciliation_status = 'MATCHED', reconciled_at = ? WHERE id = 'event-shwary'").run(now);
    sql.prepare("UPDATE ledger_batches SET posted_at = ? WHERE id = 'batch-shwary'").run(now);
    sql.prepare("UPDATE transactions SET status = 'SUCCEEDED' WHERE id = 'tx-shwary'").run();
    console.log('✓ External settlement requires verified and reconciled provider evidence.');

    addTransaction({ id: 'tx-idem-a' });
    addTransaction({ id: 'tx-idem-b' });
    addTransaction({ id: 'tx-idem-other', userId: 'user-b', sourceWalletId: 'wallet-other', destinationWalletId: null });
    const insertIdempotency = sql.prepare('INSERT INTO idempotency_keys(user_id, idempotency_key, request_sha256, transaction_id, created_at) VALUES(?, ?, ?, ?, ?)');
    insertIdempotency.run('user-a', 'request-1', 'b'.repeat(64), 'tx-idem-a', now);
    assert.throws(
      () => insertIdempotency.run('user-a', 'request-1', 'c'.repeat(64), 'tx-idem-b', now),
      /UNIQUE constraint failed/,
    );
    insertIdempotency.run('user-b', 'request-1', 'b'.repeat(64), 'tx-idem-other', now);
    assert.throws(
      () => insertIdempotency.run('user-a', 'cross-tenant-key', 'd'.repeat(64), 'tx-idem-other', now),
      /idempotency owner does not match transaction owner/,
    );
    assert.throws(
      () => sql.prepare("UPDATE idempotency_keys SET request_sha256 = ? WHERE user_id = 'user-a' AND idempotency_key = 'request-1'").run('c'.repeat(64)),
      /immutable/,
    );
    console.log('✓ Idempotency keys are unique per user and immutable.');

    addTransaction({ id: 'tx-cancel', amount: 75 });
    sql.prepare("UPDATE transactions SET status = 'PENDING' WHERE id = 'tx-cancel'").run();
    sql.prepare("INSERT INTO wallet_reservations (transaction_id, wallet_id, currency, amount_minor, status, created_at, updated_at) VALUES ('tx-cancel', 'wallet-a', 'USD', 75, 'ACTIVE', ?, ?)").run(now, now);
    sql.prepare("UPDATE transactions SET status = 'CANCELLED' WHERE id = 'tx-cancel'").run();
    const cancelled = sql.prepare("SELECT status FROM wallet_reservations WHERE transaction_id = 'tx-cancel'").get() as { status: string };
    assert.equal(cancelled.status, 'RELEASED');
    assert.throws(
      () => sql.prepare("UPDATE transactions SET status = 'PENDING' WHERE id = 'tx-cancel'").run(),
      /invalid transaction status transition/,
    );
    console.log('✓ Cancellation releases reservations and terminal states cannot be reopened.');
  } finally {
    sql.close();
  }
}
