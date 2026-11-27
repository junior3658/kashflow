import { randomUUID } from 'node:crypto';
import { db } from '../src/backend/db';
import { getFinancialRepository } from '../src/backend/financial/repository';
import { TransactionEngine } from '../src/backend/transactions';
import { WalletService } from '../src/backend/wallets';
import { paypalAdapter } from '../src/backend/providers/paypal';
import { ShwaryAdapter } from '../src/backend/providers/shwary';

export async function testTransactionSafety() {
  console.log('--- RUNNING TRANSACTION SAFETY TESTS ---');
  const userId = 'usr_junior_01';
  const seededDemoWalletIds = [
    'wlt_personal_usd', 'wlt_personal_eur', 'wlt_personal_cdf', 'wlt_business_usd',
  ];
  if (seededDemoWalletIds.some((id) => db.wallets.get(id)?.isSimulated !== true)) {
    throw new Error('Every seeded demo wallet must be explicitly marked as simulated.');
  }
  console.log('✓ Seeded personal and business balances are explicitly marked SIMULATED.');
  const sourceWalletId = 'wlt_personal_usd';
  const seedWallet = db.wallets.get(sourceWalletId)!;
  const before = seedWallet.internalAccountingBalance;
  const destinationWalletId = 'wlt_transaction_test_destination';
  db.wallets.set(destinationWalletId, {
    id: destinationWalletId,
    ownerId: userId,
    type: 'PERSONAL',
    currency: 'USD',
    name: 'Transaction test destination',
    internalAccountingBalance: 0,
    externalProviderBalance: 0,
    externalProviderBalanceStatus: 'NOT_SYNCED',
    pendingDebits: 0,
    pendingCredits: 0,
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  if (seedWallet.externalProviderBalance !== 0 || seedWallet.externalProviderBalanceStatus !== 'NOT_SYNCED') {
    throw new Error('Seed ledger balances must not be represented as verified provider funds.');
  }

  const draft = TransactionEngine.createDraft({
    userId, type: 'TRANSFER', sourceWalletId, destinationWalletId, amount: 1000, currency: 'USD',
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
    throw new Error('Source wallet balance did not match the successful ledger settlement.');
  }
  if (db.wallets.get(destinationWalletId)!.internalAccountingBalance !== 1000) {
    throw new Error('Destination wallet did not receive the internal transfer credit.');
  }

  let refundRejected = false;
  try { TransactionEngine.refundTransaction(settled.id, 'Safety test'); }
  catch (error) { refundRejected = error instanceof Error && error.message.includes('Refunds are disabled'); }
  if (!refundRejected) throw new Error('A one-sided in-memory refund was accepted.');
  if (db.wallets.get(sourceWalletId)!.internalAccountingBalance !== before - 1000 ||
      db.wallets.get(destinationWalletId)!.internalAccountingBalance !== 1000) {
    throw new Error('A rejected refund changed a wallet balance.');
  }
  console.log('✓ Internal wallet-to-wallet settlement passed; unsafe one-sided refund was rejected.');

  let payoutWithoutDestinationRejected = false;
  try {
    TransactionEngine.createDraft({
      userId, type: 'TRANSFER', sourceWalletId, amount: 200, currency: 'USD',
      provider: 'INTERNAL', description: 'External beneficiary must not use the internal transfer path',
    });
  } catch (error) {
    payoutWithoutDestinationRejected = error instanceof Error && error.message.includes('owned destination wallet');
  }
  if (!payoutWithoutDestinationRejected) {
    throw new Error('An internal draft without a destination wallet was accepted.');
  }
  console.log('✓ Internal drafts require an owned destination wallet before creation.');

  let unreservedDebitRejected = false;
  try { WalletService.applySettledDebit(sourceWalletId, 1); }
  catch { unreservedDebitRejected = true; }
  if (!unreservedDebitRejected) throw new Error('A wallet debit without a matching reservation was accepted.');
  console.log('✓ Settlement requires a matching pending reservation.');

  const releaseDraft = TransactionEngine.createDraft({
    userId, type: 'TRANSFER', sourceWalletId, destinationWalletId, amount: 100, currency: 'USD',
    provider: 'INTERNAL', description: 'Exact reservation release test',
  });
  TransactionEngine.markPending(releaseDraft.id);
  let excessiveReleaseRejected = false;
  try { WalletService.releasePendingDebit(sourceWalletId, 101); }
  catch { excessiveReleaseRejected = true; }
  if (!excessiveReleaseRejected) throw new Error('A release larger than the pending reservation was accepted.');
  TransactionEngine.cancelTransaction(releaseDraft.id, 'Test cleanup');
  if (db.wallets.get(sourceWalletId)!.pendingDebits !== 0) {
    throw new Error('Exact reservation cancellation did not restore the pending debit amount.');
  }
  console.log('✓ Reservation release amount is checked exactly.');

  let ownershipRejected = false;
  try {
    TransactionEngine.createDraft({
      userId: 'usr_unrelated_user', type: 'TRANSFER', sourceWalletId, destinationWalletId, amount: 100, currency: 'USD',
      provider: 'INTERNAL', description: 'Cross-tenant access test',
    });
  } catch { ownershipRejected = true; }
  if (!ownershipRejected) throw new Error('Cross-tenant source wallet access was not rejected.');
  console.log('✓ Cross-tenant wallet ownership check passed.');

  let forgedOrganizationRejected = false;
  try {
    TransactionEngine.createDraft({
      userId: 'usr_patrick_02', orgId: 'org_kashflow_corp', type: 'TRANSFER',
      sourceWalletId: 'wlt_business_usd', destinationWalletId: sourceWalletId,
      amount: 100, currency: 'USD', provider: 'INTERNAL', description: 'Forged organization context',
    });
  } catch { forgedOrganizationRejected = true; }
  if (!forgedOrganizationRejected) throw new Error('A user without organization membership accessed a business wallet.');

  let businessWithoutMembershipContextRejected = false;
  try {
    TransactionEngine.createDraft({
      userId, type: 'TRANSFER', sourceWalletId: 'wlt_business_usd', destinationWalletId: sourceWalletId,
      amount: 100, currency: 'USD', provider: 'INTERNAL', description: 'Missing organization context',
    });
  } catch { businessWithoutMembershipContextRejected = true; }
  if (!businessWithoutMembershipContextRejected) throw new Error('A business wallet was accessed without explicit organization context.');

  const membershipTestUserId = `usr_membership_${randomUUID()}`;
  const membershipTestOrgId = `org_${membershipTestUserId}`;
  const membershipTestWalletId = `wlt_${membershipTestOrgId}_usd`;
  const membershipTestPersonalWalletId = `wlt_${membershipTestUserId}_usd`;
  const membershipTestCreatedAt = new Date().toISOString();
  const financialRepository = getFinancialRepository();
  financialRepository.provisionPersonalWallets(membershipTestUserId, membershipTestCreatedAt);
  financialRepository.provisionBusinessWallet(
    membershipTestUserId, membershipTestOrgId, 'Membership authorization test', membershipTestCreatedAt,
  );

  // A legacy in-memory idempotency key must not shadow a persistent-wallet transfer.
  const legacyCollisionKey = `legacy-shadow-${randomUUID()}`;
  const legacyShadowId = `tx_legacy_shadow_${randomUUID()}`;
  const persistentBoundaryParams = {
    userId: membershipTestUserId,
    orgId: membershipTestOrgId,
    type: 'TRANSFER' as const,
    sourceWalletId: membershipTestPersonalWalletId,
    destinationWalletId: membershipTestWalletId,
    amount: 100,
    currency: 'USD' as const,
    provider: 'INTERNAL' as const,
    description: 'Persistent idempotency storage boundary',
  };
  const legacyShadow = {
    id: legacyShadowId,
    idempotencyKey: legacyCollisionKey,
    ...persistentBoundaryParams,
    status: 'CREATED' as const,
    fee: 0,
    createdAt: membershipTestCreatedAt,
    updatedAt: membershipTestCreatedAt,
  };
  db.transactions.set(legacyShadowId, legacyShadow);
  db.idempotencyStore.set(`${membershipTestUserId}:${legacyCollisionKey}`, {
    transactionId: legacyShadowId, response: legacyShadow, createdAt: Date.now(),
  });
  let legacyCollisionRejected = false;
  try {
    TransactionEngine.createDraft({ ...persistentBoundaryParams, idempotencyKey: legacyCollisionKey });
  } catch (error) {
    legacyCollisionRejected = error instanceof Error && error.message.includes('legacy in-memory store');
  }
  if (!legacyCollisionRejected) throw new Error('A legacy Map idempotency entry shadowed a persistent-wallet transfer.');
  db.transactions.delete(legacyShadowId);
  db.idempotencyStore.delete(`${membershipTestUserId}:${legacyCollisionKey}`);

  const persistentBoundaryDraft = TransactionEngine.createDraft({
    ...persistentBoundaryParams, idempotencyKey: `persistent-boundary-${randomUUID()}`,
  });
  if (!financialRepository.hasTransaction(persistentBoundaryDraft.id)) {
    throw new Error('A transfer using persistent wallets did not create a SQLite transaction.');
  }
  financialRepository.cancelInternalTransaction(persistentBoundaryDraft.id, membershipTestUserId, 'Test cleanup');
  console.log('✓ Legacy Map idempotency cannot shadow or downgrade a persistent SQLite transfer.');
  db.users.set(membershipTestUserId, {
    id: membershipTestUserId, email: `${membershipTestUserId}@example.test`,
    fullName: 'Membership Test Owner', role: 'BUSINESS_OWNER',
    currentOrgId: membershipTestOrgId, createdAt: membershipTestCreatedAt,
  });
  db.organizations.set(membershipTestOrgId, {
    id: membershipTestOrgId, name: 'Membership authorization test',
    ownerUserId: membershipTestUserId, currency: 'USD', status: 'ACTIVE',
    createdAt: membershipTestCreatedAt,
  });
  db.memberships.set(`mem_${membershipTestUserId}`, {
    id: `mem_${membershipTestUserId}`, orgId: membershipTestOrgId,
    userId: membershipTestUserId, role: 'OWNER', permissions: ['ALL'],
  });
  db.wallets.set(membershipTestWalletId, {
    id: membershipTestWalletId, ownerId: membershipTestOrgId, type: 'BUSINESS',
    currency: 'USD', name: 'Membership Test Treasury', internalAccountingBalance: 0,
    externalProviderBalance: 0, externalProviderBalanceStatus: 'NOT_SYNCED',
    pendingDebits: 0, pendingCredits: 0, status: 'ACTIVE',
    createdAt: membershipTestCreatedAt, updatedAt: membershipTestCreatedAt,
  });
  db.wallets.set(membershipTestPersonalWalletId, {
    id: membershipTestPersonalWalletId, ownerId: membershipTestUserId, type: 'PERSONAL',
    currency: 'USD', name: 'Membership Test Personal Wallet', internalAccountingBalance: 0,
    externalProviderBalance: 0, externalProviderBalanceStatus: 'NOT_SYNCED',
    pendingDebits: 0, pendingCredits: 0, status: 'ACTIVE',
    createdAt: membershipTestCreatedAt, updatedAt: membershipTestCreatedAt,
  });
  const authorizedBusinessDraft = TransactionEngine.createDraft({
    userId: membershipTestUserId, orgId: membershipTestOrgId, type: 'TRANSFER',
    sourceWalletId: membershipTestWalletId, destinationWalletId: membershipTestPersonalWalletId,
    amount: 100, currency: 'USD', provider: 'INTERNAL',
    description: 'Authorized persistent organization member access',
    idempotencyKey: `authorized-membership-${randomUUID()}`,
  });
  TransactionEngine.cancelTransaction(authorizedBusinessDraft.id, 'Test cleanup', membershipTestUserId);

  if (!financialRepository.revokeOrganizationMembership(membershipTestUserId, membershipTestOrgId)) {
    throw new Error('Persistent membership revocation failed.');
  }
  let revokedMembershipAccessRejected = false;
  try {
    TransactionEngine.createDraft({
      userId: membershipTestUserId, orgId: membershipTestOrgId, type: 'TRANSFER',
      sourceWalletId: membershipTestWalletId, destinationWalletId: membershipTestPersonalWalletId,
      amount: 100, currency: 'USD', provider: 'INTERNAL',
      description: 'Revoked membership must not authorize a new draft',
      idempotencyKey: `revoked-membership-${randomUUID()}`,
    });
  } catch (error) {
    revokedMembershipAccessRejected = error instanceof Error &&
      error.message.includes('persistent organization transaction membership');
  }
  if (!revokedMembershipAccessRejected) {
    throw new Error('A revoked persistent organization membership still authorized a wallet draft.');
  }
  console.log('✓ Business-wallet access requires active persistent membership; revocation overrides runtime membership.');

  db.users.delete(membershipTestUserId);
  db.organizations.delete(membershipTestOrgId);
  db.memberships.delete(`mem_${membershipTestUserId}`);
  db.wallets.delete(membershipTestWalletId);
  db.wallets.delete(membershipTestPersonalWalletId);

  let destinationOwnershipRejected = false;
  try {
    TransactionEngine.createDraft({
      userId, type: 'TRANSFER', sourceWalletId, destinationWalletId: 'wlt_business_usd',
      amount: 100, currency: 'USD', provider: 'INTERNAL',
      description: 'Cross-tenant destination wallet test',
    });
  } catch { destinationOwnershipRejected = true; }
  if (!destinationOwnershipRejected) {
    throw new Error('Cross-tenant destination wallet access was not rejected.');
  }
  console.log('✓ Cross-tenant destination wallet check passed.');

  let externalReservationRejected = false;
  const externalDraft = TransactionEngine.createDraft({
    userId, type: 'TRANSFER', sourceWalletId, amount: 500, currency: 'USD',
    provider: 'SHWARY', description: 'External provider must not reserve through the generic engine',
  });
  const pendingBeforeExternalAttempt = db.wallets.get(sourceWalletId)!.pendingDebits;
  try { TransactionEngine.markPending(externalDraft.id); }
  catch (error) {
    externalReservationRejected = error instanceof Error && error.message.includes('verified provider workflow');
  }
  if (!externalReservationRejected || externalDraft.status !== 'CREATED' ||
      db.wallets.get(sourceWalletId)!.pendingDebits !== pendingBeforeExternalAttempt) {
    throw new Error('Generic engine reserved funds for an external-provider transaction.');
  }
  TransactionEngine.cancelTransaction(externalDraft.id, 'Test cleanup');
  console.log('✓ External-provider drafts cannot reserve funds through the generic engine.');

  let insufficientFundsRejected = false;
  const tooLarge = TransactionEngine.createDraft({
    userId, type: 'TRANSFER', sourceWalletId, destinationWalletId, amount: Number.MAX_SAFE_INTEGER,
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
  WalletService.applySettledCredit(sourceWalletId, 250);
  if (walletBeforeCredit.externalProviderBalance !== providerBalanceBeforeCredit) {
    throw new Error('An internal ledger credit incorrectly changed the provider balance.');
  }
  if (walletBeforeCredit.internalAccountingBalance !== internalBalanceBeforeCredit + 250) {
    throw new Error('Internal wallet credit was not applied.');
  }
  walletBeforeCredit.internalAccountingBalance = internalBalanceBeforeCredit;
  console.log('✓ Internal/provider balance separation check passed.');

  db.wallets.delete(destinationWalletId);

  const paypalVerification = await paypalAdapter.verifyWebhookSignature({
    transmissionId: 'test-transmission',
    timestamp: new Date().toISOString(),
    webhookId: 'test-webhook-id',
    signature: 'syntactically-present-but-not-verified',
    certUrl: 'https://api.paypal.com/certs/test',
  }, { event_type: 'PAYMENT.CAPTURE.COMPLETED' });
  if (paypalVerification.isValid) {
    throw new Error('PayPal webhook verifier accepted headers without cryptographic verification.');
  }

  let paypalOrderDisabled = false;
  try {
    await paypalAdapter.createOrder({ amountCents: 1000, currency: 'USD', description: 'Disabled adapter test' });
  } catch (error) {
    paypalOrderDisabled = error instanceof Error && error.message.includes('disabled');
  }
  if (!paypalOrderDisabled) throw new Error('PayPal adapter returned a simulated order instead of failing closed.');

  let paypalCaptureDisabled = false;
  try { await paypalAdapter.captureOrder('PAYPAL-ORD-test'); }
  catch (error) {
    paypalCaptureDisabled = error instanceof Error && error.message.includes('disabled');
  }
  if (!paypalCaptureDisabled) throw new Error('PayPal adapter returned a simulated capture instead of failing closed.');
  console.log('✓ PayPal order creation, capture and unimplemented webhook verification all fail closed.');

  const shwaryEnvKeys = [
    'SHWARY_MERCHANT_ID', 'SHWARY_MERCHANT_KEY', 'SHWARY_BASE_URL',
    'SHWARY_MODE', 'SHWARY_CALLBACK_URL',
  ] as const;
  const previousShwaryEnv: Record<string, string | undefined> = {};
  for (const key of shwaryEnvKeys) previousShwaryEnv[key] = process.env[key];
  const previousFetch = globalThis.fetch;
  const providerBoundaryBalance = db.wallets.get(sourceWalletId)!.internalAccountingBalance;

  try {
    process.env.SHWARY_MERCHANT_ID = 'test-merchant';
    process.env.SHWARY_MERCHANT_KEY = 'test-key-not-used-outside-mocked-fetch';
    process.env.SHWARY_BASE_URL = 'https://shwary.test';
    process.env.SHWARY_MODE = 'sandbox';
    delete process.env.SHWARY_CALLBACK_URL;

    globalThis.fetch = async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ status: 'COMPLETED', amount: 100 }),
    } as Response);

    const shwary = new ShwaryAdapter();
    const accepted = await shwary.requestEncashment({
      amountCents: 10000,
      currency: 'CDF',
      customerPhone: '+243810000000',
    });
    if (accepted.status !== 'PENDING_PROVIDER_CONFIRMATION') {
      throw new Error('A Shwary HTTP 2xx response was incorrectly treated as final provider settlement.');
    }

    const capabilities = shwary.getCapabilities();
    if (capabilities.b2cPayouts.integrationReady || capabilities.merchantBalance.integrationReady ||
        capabilities.reusedCollectedFunds.supported) {
      throw new Error('Undocumented Shwary payout, merchant-balance or collected-fund reuse capability was enabled.');
    }

    let payoutDisabled = false;
    try { await shwary.executePayout(); }
    catch (error) { payoutDisabled = error instanceof Error && error.message.includes('not enabled'); }
    if (!payoutDisabled) throw new Error('Shwary payout was not blocked.');

    let merchantBalanceDisabled = false;
    try { await shwary.getMerchantBalance(); }
    catch (error) { merchantBalanceDisabled = error instanceof Error && error.message.includes('not enabled'); }
    if (!merchantBalanceDisabled) throw new Error('Shwary merchant balance was not blocked.');

    if (db.wallets.get(sourceWalletId)!.internalAccountingBalance !== providerBoundaryBalance) {
      throw new Error('A provider HTTP 2xx response changed an internal wallet balance.');
    }
    console.log('✓ Shwary HTTP 2xx remains PENDING_PROVIDER_CONFIRMATION and cannot credit a wallet.');
    console.log('✓ Shwary payouts, merchant balance and collected-fund reuse remain disabled.');
  } finally {
    globalThis.fetch = previousFetch;
    for (const key of shwaryEnvKeys) {
      const previous = previousShwaryEnv[key];
      if (previous === undefined) delete process.env[key];
      else process.env[key] = previous;
    }
  }
}
