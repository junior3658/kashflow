import assert from 'node:assert/strict';
import { openFinancialDatabase } from '../src/backend/financial/schema';
import { FinancialRepository } from '../src/backend/financial/repository';

export function testFinancialPersistentTransactions() {
  console.log('--- RUNNING PERSISTENT TRANSACTION ENGINE TESTS ---');
  const sql = openFinancialDatabase(':memory:');
  const repository = new FinancialRepository(sql);
  const now = new Date().toISOString();

  const addWallet = (id: string, ownerId: string, balance: number, addAccount = true) => {
    sql.prepare(
      "INSERT INTO wallets (id, owner_type, owner_id, wallet_type, currency, name, internal_balance_minor, provider_balance_status, pending_debits_minor, pending_credits_minor, is_simulated, status, created_at, updated_at) VALUES (?, 'USER', ?, 'PERSONAL', 'USD', ?, ?, 'NOT_SYNCED', 0, 0, 0, 'ACTIVE', ?, ?)"
    ).run(id, ownerId, id, balance, now, now);
    if (addAccount) {
      sql.prepare(
        "INSERT INTO ledger_accounts (id, code, name, account_type, currency, wallet_id, balance_minor, created_at) VALUES (?, ?, ?, 'LIABILITY', 'USD', ?, ?, ?)"
      ).run('la_' + id, 'WALLET_' + id, id, id, balance, now);
    }
  };

  try {
    addWallet('wallet-a', 'user-a', 10000);
    addWallet('wallet-b', 'user-a', 0);
    addWallet('wallet-c', 'user-a', 0);
    addWallet('wallet-no-account', 'user-a', 0, false);
    addWallet('wallet-user-b', 'user-b', 0);
    addWallet('wallet-user-b-dest', 'user-b', 0);

    const source = repository.getWalletForTransaction('wallet-a', 'user-a');
    assert.equal(source?.internalAccountingBalance, 10000);
    assert.throws(() => repository.getWalletForTransaction('wallet-a', 'user-b'), /outside the authenticated user scope/);

    const input = {
      userId: 'user-a',
      sourceWalletId: 'wallet-a',
      destinationWalletId: 'wallet-b',
      amountMinor: 1000,
      currency: 'USD' as const,
      description: 'Persistent internal transfer',
      idempotencyKey: 'persistent-transfer-001',
    };
    assert.throws(
      () => repository.createInternalTransferDraft({ ...input, idempotencyKey: '' }),
      /idempotency key/,
    );
    const draft = repository.createInternalTransferDraft(input);
    assert.equal(draft.status, 'CREATED');
    const duplicate = repository.createInternalTransferDraft(input);
    assert.equal(duplicate.id, draft.id);
    assert.throws(
      () => repository.createInternalTransferDraft({ ...input, amountMinor: 1001 }),
      /different transaction payload/,
    );

    const pending = repository.markInternalTransactionPending(draft.id, 'user-a');
    assert.equal(pending.status, 'PENDING');
    assert.equal((sql.prepare("SELECT pending_debits_minor FROM wallets WHERE id = 'wallet-a'").get() as {pending_debits_minor:number}).pending_debits_minor, 1000);

    const settled = repository.executeInternalTransfer(draft.id, 'user-a');
    assert.equal(settled.status, 'SUCCEEDED');
    const settledRetry = repository.executeInternalTransfer(draft.id, 'user-a');
    assert.equal(settledRetry.status, 'SUCCEEDED');
    const balances = sql.prepare(
      "SELECT id, internal_balance_minor, pending_debits_minor FROM wallets WHERE id IN ('wallet-a', 'wallet-b') ORDER BY id"
    ).all() as Array<{id:string;internal_balance_minor:number;pending_debits_minor:number}>;
    assert.deepEqual(balances, [
      { id: 'wallet-a', internal_balance_minor: 9000, pending_debits_minor: 0 },
      { id: 'wallet-b', internal_balance_minor: 1000, pending_debits_minor: 0 },
    ]);
    const posting = sql.prepare(
      "SELECT COUNT(*) AS count, SUM(CASE WHEN entry_type = 'DEBIT' THEN amount_minor ELSE 0 END) AS debits, SUM(CASE WHEN entry_type = 'CREDIT' THEN amount_minor ELSE 0 END) AS credits FROM ledger_entries e JOIN ledger_batches b ON b.id = e.batch_id WHERE b.transaction_id = ? AND b.batch_type = 'POSTING' AND b.posted_at IS NOT NULL"
    ).get(draft.id) as {count:number;debits:number;credits:number};
    assert.equal(posting.count, 2);
    assert.equal(posting.debits, 1000);
    assert.equal(posting.credits, 1000);
    assert.equal(
      (sql.prepare("SELECT COUNT(*) AS count FROM ledger_batches WHERE transaction_id = ? AND batch_type = 'POSTING' AND posted_at IS NOT NULL").get(draft.id) as {count:number}).count,
      1,
    );
    assert.equal(repository.getTransactionForUser(draft.id, 'user-b'), null);
    assert.equal(repository.getTransactionsByUser('user-a').some((tx) => tx.id === draft.id), true);

    assert.throws(
      () => repository.refundInternalTransfer(draft.id, 'user-b', 'Unauthorized refund'),
      /not found for authenticated user/,
    );
    const drainDraft = repository.createInternalTransferDraft({
      ...input, sourceWalletId: 'wallet-b', destinationWalletId: 'wallet-c',
      amountMinor: 1000, idempotencyKey: 'persistent-refund-drain',
    });
    repository.markInternalTransactionPending(drainDraft.id, 'user-a');
    repository.executeInternalTransfer(drainDraft.id, 'user-a');
    assert.throws(
      () => repository.refundInternalTransfer(draft.id, 'user-a', 'Insufficient recipient balance'),
      /Destination funds are unavailable/,
    );
    assert.equal(repository.getTransactionForUser(draft.id, 'user-a')?.status, 'SUCCEEDED');
    assert.equal(
      (sql.prepare("SELECT COUNT(*) AS count FROM ledger_batches WHERE transaction_id = ? AND batch_type = 'REVERSAL'").get(draft.id) as {count:number}).count,
      0,
    );
    repository.refundInternalTransfer(drainDraft.id, 'user-a', 'Restore wallet-b');
    const refunded = repository.refundInternalTransfer(draft.id, 'user-a', 'Restore wallet-a');
    assert.equal(refunded.status, 'REFUNDED');
    const refundRetry = repository.refundInternalTransfer(draft.id, 'user-a', 'Retry');
    assert.equal(refundRetry.status, 'REFUNDED');
    const refundCounts = sql.prepare(
      "SELECT COUNT(*) AS count, SUM(total_debits_minor) AS debits, SUM(total_credits_minor) AS credits FROM ledger_batches WHERE transaction_id = ? AND batch_type = 'REVERSAL' AND posted_at IS NOT NULL"
    ).get(draft.id) as {count:number;debits:number;credits:number};
    assert.equal(refundCounts.count, 1);
    assert.equal(refundCounts.debits, 1000);
    assert.equal(refundCounts.credits, 1000);
    assert.deepEqual(
      sql.prepare("SELECT id, internal_balance_minor, pending_debits_minor FROM wallets WHERE id IN ('wallet-a', 'wallet-b', 'wallet-c') ORDER BY id")
        .all() as Array<{id:string;internal_balance_minor:number;pending_debits_minor:number}>,
      [
        { id: 'wallet-a', internal_balance_minor: 10000, pending_debits_minor: 0 },
        { id: 'wallet-b', internal_balance_minor: 0, pending_debits_minor: 0 },
        { id: 'wallet-c', internal_balance_minor: 0, pending_debits_minor: 0 },
      ],
    );
    console.log('✓ Persistent refunds require owner scope and unreserved recipient funds.');
    console.log('✓ Exact inverse postings restore projections atomically; refund retries are idempotent.');

    const cancelDraft = repository.createInternalTransferDraft({
      ...input, amountMinor: 500, idempotencyKey: 'persistent-transfer-cancel',
    });
    repository.markInternalTransactionPending(cancelDraft.id, 'user-a');
    const cancelled = repository.cancelInternalTransaction(cancelDraft.id, 'user-a', 'Test cancellation');
    assert.equal(cancelled.status, 'CANCELLED');
    const cancelledRetry = repository.cancelInternalTransaction(cancelDraft.id, 'user-a', 'Test cancellation retry');
    assert.equal(cancelledRetry.status, 'CANCELLED');
    assert.equal((sql.prepare("SELECT pending_debits_minor FROM wallets WHERE id = 'wallet-a'").get() as {pending_debits_minor:number}).pending_debits_minor, 0);

    const insufficient = repository.createInternalTransferDraft({
      ...input, amountMinor: 999999, idempotencyKey: 'persistent-transfer-insufficient',
    });
    assert.throws(() => repository.markInternalTransactionPending(insufficient.id, 'user-a'), /insufficient available wallet balance/);
    assert.equal(repository.getTransactionForUser(insufficient.id, 'user-a')?.status, 'CREATED');

    const rollbackDraft = repository.createInternalTransferDraft({
      ...input, destinationWalletId: 'wallet-no-account', amountMinor: 100,
      idempotencyKey: 'persistent-transfer-rollback',
    });
    repository.markInternalTransactionPending(rollbackDraft.id, 'user-a');
    const sourceBeforeRollback = sql.prepare(
      "SELECT internal_balance_minor, pending_debits_minor FROM wallets WHERE id = 'wallet-a'"
    ).get() as {internal_balance_minor:number;pending_debits_minor:number};
    assert.throws(() => repository.executeInternalTransfer(rollbackDraft.id, 'user-a'), /linked LIABILITY ledger accounts/);
    assert.equal(repository.getTransactionForUser(rollbackDraft.id, 'user-a')?.status, 'PENDING');
    assert.deepEqual(
      sql.prepare("SELECT internal_balance_minor, pending_debits_minor FROM wallets WHERE id = 'wallet-a'").get(),
      sourceBeforeRollback,
    );
    assert.equal((sql.prepare('SELECT COUNT(*) AS count FROM ledger_batches WHERE transaction_id = ?').get(rollbackDraft.id) as {count:number}).count, 0);

    assert.throws(
      () => repository.createInternalTransferDraft({
        ...input, destinationWalletId: 'wallet-user-b', idempotencyKey: 'persistent-cross-tenant',
      }),
      /destination wallet is outside the transaction tenant/,
    );
    const otherTenantDraft = repository.createInternalTransferDraft({
      userId: 'user-b',
      sourceWalletId: 'wallet-user-b',
      destinationWalletId: 'wallet-user-b-dest',
      amountMinor: 1,
      currency: 'USD',
      description: 'Different tenant idempotency scope',
      idempotencyKey: 'persistent-transfer-001',
    });
    assert.notEqual(otherTenantDraft.id, draft.id);
    console.log('✓ SQLite draft creation and per-user idempotency are persistent and immutable.');
    console.log('✓ PENDING reservation and balanced two-line settlement are atomic.');
    console.log('✓ Cancellation releases the reservation; insufficient funds do not change state.');
    console.log('✓ Failed posting rolls back status, ledger and wallet projections.');
    console.log('✓ Transaction reads and wallet access remain isolated by authenticated user.');
  } finally {
    sql.close();
  }
}
