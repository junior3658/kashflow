import assert from 'node:assert/strict';
import { openFinancialDatabase } from '../src/backend/financial/schema';
import { FinancialRepository } from '../src/backend/financial/repository';

export function testFinancialWalletProvisioning() {
  console.log('--- RUNNING PERSISTENT PERSONAL-WALLET PROVISIONING TESTS ---');
  const sql = openFinancialDatabase(':memory:');
  const repository = new FinancialRepository(sql);
  const createdAt = '2026-11-22T10:00:00.000Z';

  try {
    const first = repository.provisionPersonalWallets('user-a', createdAt);
    assert.deepEqual(first, [
      'wlt_user-a_usd',
      'wlt_user-a_eur',
      'wlt_user-a_cdf',
    ]);

    const wallets = sql.prepare(
      'SELECT id, owner_type, owner_id, wallet_type, currency, internal_balance_minor, provider_balance_status, is_simulated FROM wallets WHERE owner_id = ? ORDER BY currency'
    ).all('user-a') as Array<Record<string, unknown>>;
    assert.equal(wallets.length, 3);
    for (const wallet of wallets) {
      assert.equal(wallet.owner_type, 'USER');
      assert.equal(wallet.owner_id, 'user-a');
      assert.equal(wallet.wallet_type, 'PERSONAL');
      assert.equal(wallet.internal_balance_minor, 0);
      assert.equal(wallet.provider_balance_status, 'NOT_SYNCED');
      assert.equal(wallet.is_simulated, 0);
    }

    const accounts = sql.prepare(
      'SELECT wallet_id, currency, account_type, balance_minor FROM ledger_accounts WHERE wallet_id IN (?, ?, ?)'
    ).all(...first) as Array<Record<string, unknown>>;
    assert.equal(accounts.length, 3);
    for (const account of accounts) {
      assert.equal(account.account_type, 'LIABILITY');
      assert.equal(account.balance_minor, 0);
    }

    const second = repository.provisionPersonalWallets('user-a', '2026-11-23T10:00:00.000Z');
    assert.deepEqual(second, first);
    assert.equal((sql.prepare('SELECT COUNT(*) AS count FROM wallets WHERE owner_id = ?').get('user-a') as {count:number}).count, 3);
    assert.equal((sql.prepare('SELECT COUNT(*) AS count FROM ledger_accounts WHERE wallet_id IN (?, ?, ?)').get(...first) as {count:number}).count, 3);
    assert.equal((sql.prepare('SELECT created_at FROM wallets WHERE id = ?').get(first[0]) as {created_at:string}).created_at, createdAt);

    const otherUser = repository.provisionPersonalWallets('user-b', createdAt);
    assert.equal(otherUser.length, 3);
    assert.equal((sql.prepare('SELECT COUNT(*) AS count FROM wallets WHERE owner_id = ?').get('user-b') as {count:number}).count, 3);
    assert.notDeepEqual(otherUser, first);

    assert.throws(() => repository.provisionPersonalWallets('', createdAt), /owner ID/);
    console.log('✓ Personal wallets and linked zero-balance liability accounts are provisioned atomically and idempotently.');
    console.log('✓ Wallet identities remain isolated by authenticated user.');
  } finally {
    sql.close();
  }
}
