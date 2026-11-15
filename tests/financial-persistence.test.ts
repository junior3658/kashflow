import { db, KashflowDatabase } from '../src/backend/db';

export async function testFinancialPersistence() {
  console.log('--- RUNNING FINANCIAL PERSISTENCE TESTS ---');
  const walletId = 'wlt_personal_usd';
  const wallet = db.wallets.get(walletId);
  if (!wallet) throw new Error('Persistence test wallet is missing.');

  const originalBalance = wallet.internalAccountingBalance;
  const markerId = 'usr_persistence_test_marker';
  const marker = {
    id: markerId,
    email: 'persistence-marker@example.test',
    fullName: 'Persistence Test',
    role: 'PERSONAL_USER' as const,
    createdAt: new Date().toISOString(),
  };

  try {
    wallet.internalAccountingBalance = originalBalance + 731;
    db.users.set(markerId, marker);
    db.persist();

    const restartedDatabase = new KashflowDatabase();
    const restoredWallet = restartedDatabase.wallets.get(walletId);
    if (restoredWallet?.internalAccountingBalance !== originalBalance + 731) {
      throw new Error('Wallet balance was not restored from SQLite after database reinitialization.');
    }
    if (restartedDatabase.users.get(markerId)?.email !== marker.email) {
      throw new Error('User domain record was not restored from SQLite.');
    }
    console.log('✓ Wallet balances and domain records survive database reinitialization.');
  } finally {
    wallet.internalAccountingBalance = originalBalance;
    db.users.delete(markerId);
    db.persist();
  }
}
