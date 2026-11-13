import { db } from '../src/backend/db';
import { TransactionEngine } from '../src/backend/transactions';

export async function testTransactionSafety() {
  console.log('--- RUNNING TRANSACTION SAFETY TESTS ---');
  const userId = 'usr_junior_01';
  const sourceWalletId = 'wlt_personal_usd';
  const before = db.wallets.get(sourceWalletId)!.internalAccountingBalance;

  const draft = TransactionEngine.createDraft({
    userId, type: 'TRANSFER', sourceWalletId, amount: 1000, currency: 'USD',
    provider: 'INTERNAL', description: 'Automated transaction safety test',
    idempotencyKey: 'transaction-safety-test-001',
  });
  TransactionEngine.markPending(draft.id);
  if (db.wallets.get(sourceWalletId)!.pendingDebits !== 1000) {
    throw new Error('Pending transaction did not reserve the expected amount.');
  }
  const settled = TransactionEngine.executeTransaction(draft.id);
  if (settled.status !== 'SUCCEEDED') throw new Error('A valid pending internal transfer did not settle.');
  if (db.wallets.get(sourceWalletId)!.internalAccountingBalance !== before - 1000) {
    throw new Error('Wallet balance did not match the successful ledger settlement.');
  }
  console.log('✓ Pending reservation and internal settlement passed.');

  let ownershipRejected = false;
  try {
    TransactionEngine.createDraft({
      userId: 'usr_unrelated_user', type: 'TRANSFER', sourceWalletId, amount: 100, currency: 'USD',
      provider: 'INTERNAL', description: 'Cross-tenant access test',
    });
  } catch { ownershipRejected = true; }
  if (!ownershipRejected) throw new Error('Cross-tenant source wallet access was not rejected.');
  console.log('✓ Cross-tenant wallet ownership check passed.');

  let externalSettlementRejected = false;
  const externalDraft = TransactionEngine.createDraft({
    userId, type: 'TRANSFER', sourceWalletId, amount: 500, currency: 'USD',
    provider: 'SHWARY', description: 'External provider must not settle generically',
  });
  TransactionEngine.markPending(externalDraft.id);
  try { TransactionEngine.executeTransaction(externalDraft.id); }
  catch { externalSettlementRejected = true; }
  if (!externalSettlementRejected) throw new Error('Generic engine settled an external-provider transaction.');
  TransactionEngine.cancelTransaction(externalDraft.id, 'Test cleanup');
  console.log('✓ External-provider generic settlement rejection passed.');

  let insufficientFundsRejected = false;
  const tooLarge = TransactionEngine.createDraft({
    userId, type: 'TRANSFER', sourceWalletId, amount: Number.MAX_SAFE_INTEGER,
    currency: 'USD', provider: 'INTERNAL', description: 'Insufficient funds test',
  });
  try { TransactionEngine.markPending(tooLarge.id); }
  catch { insufficientFundsRejected = true; }
  if (!insufficientFundsRejected) throw new Error('Insufficient funds were not rejected during reservation.');
  console.log('✓ Insufficient funds reservation check passed.');
  let idempotencyConflictRejected = false;
  try {
    TransactionEngine.createDraft({
      userId, type: 'TRANSFER', sourceWalletId, amount: 2000, currency: 'USD',
      provider: 'INTERNAL', description: 'Different payload with same key',
      idempotencyKey: 'transaction-safety-test-001',
    });
  } catch { idempotencyConflictRejected = true; }
  if (!idempotencyConflictRejected) {
    throw new Error('Reusing an idempotency key with a different amount was not rejected.');
  }
  console.log('✓ Idempotency payload conflict check passed.');

  const walletBeforeCredit = db.wallets.get(sourceWalletId)!;
  const providerBalanceBeforeCredit = walletBeforeCredit.externalProviderBalance;
  const internalBalanceBeforeCredit = walletBeforeCredit.internalAccountingBalance;
  const { WalletService } = await import('../src/backend/wallets');
  WalletService.applySettledCredit(sourceWalletId, 250);
  if (walletBeforeCredit.externalProviderBalance !== providerBalanceBeforeCredit) {
    throw new Error('An internal ledger credit incorrectly changed the provider balance.');
  }
  if (walletBeforeCredit.internalAccountingBalance !== internalBalanceBeforeCredit + 250) {
    throw new Error('Internal wallet credit was not applied.');
  }
  walletBeforeCredit.internalAccountingBalance = internalBalanceBeforeCredit;
  console.log('✓ Internal/provider balance separation check passed.');

}
