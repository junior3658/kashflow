import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openFinancialDatabase } from '../src/backend/financial/schema';
import { FinancialRepository } from '../src/backend/financial/repository';

export function testFinancialPersistentRestart() {
  console.log('--- RUNNING FINANCIAL RESTART AND MULTI-CONNECTION TESTS ---');
  const directory = mkdtempSync(join(tmpdir(), 'kashflow-financial-'));
  const filename = join(directory, 'financial.sqlite');
  let firstDb: ReturnType<typeof openFinancialDatabase> | undefined;
  let secondDb: ReturnType<typeof openFinancialDatabase> | undefined;
  let reopenedDb: ReturnType<typeof openFinancialDatabase> | undefined;
  let finalDb: ReturnType<typeof openFinancialDatabase> | undefined;

  try {
    firstDb = openFinancialDatabase(filename);
    const firstRepository = new FinancialRepository(firstDb);
    const now = new Date().toISOString();

    const addWallet = (id: string, balance: number) => {
      firstDb!.prepare(
        "INSERT INTO wallets (id, owner_type, owner_id, wallet_type, currency, name, internal_balance_minor, provider_balance_status, pending_debits_minor, pending_credits_minor, is_simulated, status, created_at, updated_at) VALUES (?, 'USER', 'user-a', 'PERSONAL', 'USD', ?, ?, 'NOT_SYNCED', 0, 0, 0, 'ACTIVE', ?, ?)"
      ).run(id, id, balance, now, now);
      firstDb!.prepare(
        "INSERT INTO ledger_accounts (id, code, name, account_type, currency, wallet_id, balance_minor, created_at) VALUES (?, ?, ?, 'LIABILITY', 'USD', ?, ?, ?)"
      ).run(`la_${id}`, `WALLET_${id}`, id, id, balance, now);
    };

    addWallet('restart-source', 10000);
    addWallet('restart-destination', 0);

    const input = {
      userId: 'user-a',
      sourceWalletId: 'restart-source',
      destinationWalletId: 'restart-destination',
      amountMinor: 6000,
      currency: 'USD' as const,
      description: 'Restart durability transfer',
      idempotencyKey: 'restart-transfer-001',
    };
    const firstDraft = firstRepository.createInternalTransferDraft(input);

    secondDb = openFinancialDatabase(filename);
    const secondRepository = new FinancialRepository(secondDb);
    const duplicateDraft = secondRepository.createInternalTransferDraft(input);
    assert.equal(duplicateDraft.id, firstDraft.id);

    const competingDraft = secondRepository.createInternalTransferDraft({
      ...input,
      amountMinor: 6000,
      idempotencyKey: 'restart-transfer-competing',
    });

    firstRepository.markInternalTransactionPending(firstDraft.id, 'user-a');
    assert.throws(
      () => secondRepository.markInternalTransactionPending(competingDraft.id, 'user-a'),
      /insufficient available wallet balance/,
    );
    assert.equal(secondRepository.getTransactionForUser(competingDraft.id, 'user-a')?.status, 'CREATED');

    firstDb.close();
    firstDb = undefined;
    secondDb.close();
    secondDb = undefined;

    reopenedDb = openFinancialDatabase(filename);
    const reopenedRepository = new FinancialRepository(reopenedDb);
    assert.equal(reopenedRepository.getTransactionForUser(firstDraft.id, 'user-a')?.status, 'PENDING');
    assert.equal(
      (reopenedDb.prepare("SELECT pending_debits_minor FROM wallets WHERE id = 'restart-source'").get() as {pending_debits_minor:number}).pending_debits_minor,
      6000,
    );

    reopenedRepository.executeInternalTransfer(firstDraft.id, 'user-a');
    reopenedDb.close();
    reopenedDb = undefined;

    finalDb = openFinancialDatabase(filename);
    const finalRepository = new FinancialRepository(finalDb);
    assert.equal(finalRepository.getTransactionForUser(firstDraft.id, 'user-a')?.status, 'SUCCEEDED');
    assert.equal(finalRepository.createInternalTransferDraft(input).id, firstDraft.id);

    const balances = finalDb.prepare(
      "SELECT id, internal_balance_minor, pending_debits_minor FROM wallets WHERE id IN ('restart-source', 'restart-destination') ORDER BY id"
    ).all() as Array<{id:string;internal_balance_minor:number;pending_debits_minor:number}>;
    assert.deepEqual(balances, [
      { id: 'restart-destination', internal_balance_minor: 6000, pending_debits_minor: 0 },
      { id: 'restart-source', internal_balance_minor: 4000, pending_debits_minor: 0 },
    ]);

    const posting = finalDb.prepare(
      "SELECT COUNT(*) AS entries, SUM(CASE WHEN entry_type = 'DEBIT' THEN amount_minor ELSE 0 END) AS debits, SUM(CASE WHEN entry_type = 'CREDIT' THEN amount_minor ELSE 0 END) AS credits FROM ledger_entries e JOIN ledger_batches b ON b.id = e.batch_id WHERE b.transaction_id = ? AND b.batch_type = 'POSTING' AND b.posted_at IS NOT NULL"
    ).get(firstDraft.id) as {entries:number;debits:number;credits:number};
    assert.deepEqual(posting, { entries: 2, debits: 6000, credits: 6000 });

    console.log('✓ Draft, idempotency key and PENDING reservation survive database close/reopen.');
    console.log('✓ Separate SQLite connections cannot reserve the same available funds twice.');
    console.log('✓ SUCCEEDED state, balanced ledger and wallet projections survive restart.');
  } finally {
    firstDb?.close();
    secondDb?.close();
    reopenedDb?.close();
    finalDb?.close();
    rmSync(directory, { recursive: true, force: true });
  }
}
