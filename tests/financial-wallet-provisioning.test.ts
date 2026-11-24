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
    repository.provisionPersonalWallets('business-user', createdAt);
    const businessWalletId = repository.provisionBusinessWallet(
      'business-user', 'org_business-user', 'Example Business', createdAt,
    );
    assert.equal(businessWalletId, 'wlt_org_business-user_usd');
    const businessWallet = sql.prepare(
      'SELECT owner_type, owner_id, wallet_type, currency, internal_balance_minor, provider_balance_status FROM wallets WHERE id = ?'
    ).get(businessWalletId) as Record<string, unknown>;
    assert.equal(businessWallet.owner_type, 'ORGANIZATION');
    assert.equal(businessWallet.owner_id, 'org_business-user');
    assert.equal(businessWallet.wallet_type, 'BUSINESS');
    assert.equal(businessWallet.currency, 'USD');
    assert.equal(businessWallet.internal_balance_minor, 0);
    assert.equal(businessWallet.provider_balance_status, 'NOT_SYNCED');

    const ownerMembership = sql.prepare(
      'SELECT role, status, can_transact FROM organization_memberships WHERE organization_id = ? AND user_id = ?'
    ).get('org_business-user', 'business-user') as Record<string, unknown>;
    assert.equal(ownerMembership.role, 'OWNER');
    assert.equal(ownerMembership.status, 'ACTIVE');
    assert.equal(ownerMembership.can_transact, 1);
    assert.equal(repository.hasActiveMembership('business-user', 'org_business-user'), true);
    assert.equal(repository.hasActiveTransactionMembership('business-user', 'org_business-user'), true);

    const businessAccount = sql.prepare(
      'SELECT account_type, currency, wallet_id, balance_minor FROM ledger_accounts WHERE wallet_id = ?'
    ).get(businessWalletId) as Record<string, unknown>;
    assert.equal(businessAccount.account_type, 'LIABILITY');
    assert.equal(businessAccount.currency, 'USD');
    assert.equal(businessAccount.wallet_id, businessWalletId);
    assert.equal(businessAccount.balance_minor, 0);

    assert.equal(repository.provisionBusinessWallet(
      'business-user', 'org_business-user', 'Example Business', '2026-11-23T10:00:00.000Z',
    ), businessWalletId);
    assert.equal((sql.prepare('SELECT COUNT(*) AS count FROM organization_memberships WHERE organization_id = ?').get('org_business-user') as {count:number}).count, 1);
    assert.equal((sql.prepare('SELECT COUNT(*) AS count FROM wallets WHERE owner_id = ?').get('org_business-user') as {count:number}).count, 1);

    const insertOrganizationTransaction = (id: string, userId: string) => sql.prepare(`
      INSERT INTO transactions (
        id, user_id, org_id, transaction_type, status, source_wallet_id, destination_wallet_id,
        amount_minor, fee_minor, currency, provider, description, created_at, updated_at
      ) VALUES (?, ?, 'org_business-user', 'TRANSFER', 'CREATED', ?, ?, 100, 0, 'USD', 'INTERNAL', 'Tenant isolation test', ?, ?)
    `).run(id, userId, businessWalletId, 'wlt_business-user_usd', createdAt, createdAt);
    assert.doesNotThrow(() => insertOrganizationTransaction('tx_org_owner', 'business-user'));
    assert.throws(() => insertOrganizationTransaction('tx_org_intruder', 'intruder-user'), /active organization membership/);

    assert.equal(repository.revokeOrganizationMembership('business-user', 'org_business-user'), true);
    assert.equal(repository.revokeOrganizationMembership('business-user', 'org_business-user'), false);
    assert.equal(repository.hasActiveMembership('business-user', 'org_business-user'), false);
    assert.equal(repository.hasActiveTransactionMembership('business-user', 'org_business-user'), false);
    assert.throws(() => sql.prepare(`
      UPDATE organization_memberships SET status = 'ACTIVE', can_transact = 1
      WHERE organization_id = ? AND user_id = ?
    `).run('org_business-user', 'business-user'), /revoked membership cannot be reactivated/);
    assert.throws(() => sql.prepare(`
      DELETE FROM organization_memberships WHERE organization_id = ? AND user_id = ?
    `).run('org_business-user', 'business-user'), /cannot be deleted/);
    assert.throws(() => insertOrganizationTransaction('tx_org_revoked', 'business-user'), /active organization membership/);
    assert.throws(() => repository.provisionBusinessWallet(
      'business-user', 'org_business-user', 'Example Business', createdAt,
    ), /membership is revoked/);
    console.log('✓ Business wallet, owner membership and liability account persist atomically and idempotently.');
    console.log('✓ SQL tenant guard rejects non-members and revoked organization owners.');
    console.log('✓ Personal wallets and linked zero-balance liability accounts are provisioned atomically and idempotently.');
    console.log('✓ Wallet identities remain isolated by authenticated user.');
  } finally {
    sql.close();
  }
}
