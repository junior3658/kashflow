/**
 * KASHFLOW Transaction Engine
 * Implements strict state machine, idempotency control, and draft confirmation lifecycle.
 */

import { db } from './db';
import { Transaction, TransactionStatus, TransactionType, Currency, Wallet } from './types';
import { WalletService } from './wallets';
import { LedgerEngine } from './ledger';
import { getFinancialRepository } from './financial/repository';

function canAccessWallet(wallet: Wallet, userId: string, orgId?: string): boolean {
  if (wallet.ownerId === userId) return true;
  if (!orgId || wallet.ownerId !== orgId) return false;

  const organization = db.organizations.get(orgId);
  if (!organization || organization.status !== 'ACTIVE') return false;

  const membership = Array.from(db.memberships.values()).find(
    (candidate) => candidate.orgId === orgId && candidate.userId === userId,
  );
  return Boolean(membership && (
    membership.permissions.includes('ALL') || membership.permissions.includes('TRANSACT')
  ) && getFinancialRepository().hasActiveTransactionMembership(userId, orgId));
}

export interface CreateDraftParams {
  idempotencyKey?: string;
  userId: string;
  orgId?: string;
  type: TransactionType;
  sourceWalletId: string;
  destinationWalletId?: string;
  amount: number; // in cents
  currency: Currency;
  recipientName?: string;
  recipientAccount?: string;
  provider: 'INTERNAL' | 'PAYPAL' | 'SHWARY' | 'EXCHANGE_DESK' | 'CRYPTO_SIM';
  description: string;
  metadata?: Record<string, any>;
}

export class TransactionEngine {
  /**
   * Create a transaction in CREATED (draft) state.
   * Checks idempotency key to prevent duplicate creation.
   */
  static createDraft(params: CreateDraftParams): Transaction {
    if (params.idempotencyKey && (params.idempotencyKey.length > 128 || params.idempotencyKey.trim() !== params.idempotencyKey)) {
      throw new Error('Idempotency key must be 1–128 characters without surrounding whitespace.');
    }
    const scopedKey = params.idempotencyKey ? `${params.userId}:${params.idempotencyKey}` : undefined;
    if (!Number.isSafeInteger(params.amount) || params.amount <= 0) {
      throw new Error('Transaction amount must be a positive safe integer in minor currency units.');
    }

    if (params.provider === 'INTERNAL' && params.currency !== 'USD') {
      throw new Error('Internal settlement is temporarily limited to USD until currency-specific ledger accounts are configured.');
    }
    const financialRepository = getFinancialRepository();
    const sourceIsPersistent = financialRepository.hasWallet(params.sourceWalletId);
    const destinationIsPersistent = params.destinationWalletId
      ? financialRepository.hasWallet(params.destinationWalletId)
      : false;
    if (sourceIsPersistent || destinationIsPersistent) {
      // A legacy Map key must never shadow a persistent-wallet request.
      // Reusing it across storage backends is ambiguous, so fail closed.
      if (scopedKey && db.idempotencyStore.has(scopedKey)) {
        throw new Error('Idempotency key already exists in the legacy in-memory store; use a new key for persistent settlement.');
      }
      if (!sourceIsPersistent || !destinationIsPersistent) {
        throw new Error('Persistent and in-memory wallets cannot be mixed in one transaction.');
      }
      if (params.provider !== 'INTERNAL' || params.type !== 'TRANSFER') {
        throw new Error('Persistent wallet settlement is currently limited to internal transfers.');
      }
      if (!params.destinationWalletId) throw new Error('A persistent destination wallet is required.');
      if (params.recipientAccount?.trim()) {
        throw new Error('External beneficiary accounts cannot use the internal wallet-transfer path.');
      }
      const source = financialRepository.getWalletForTransaction(
        params.sourceWalletId, params.userId, params.orgId,
      );
      const destination = financialRepository.getWalletForTransaction(
        params.destinationWalletId, params.userId, params.orgId,
      );
      if (!source || !destination) throw new Error('Both transaction wallets must exist in persistent storage.');
      if (source.currency !== params.currency || destination.currency !== params.currency) {
        throw new Error('Transaction currency must match both persistent wallet currencies.');
      }
      if (source.id === destination.id || source.status !== 'ACTIVE' || destination.status !== 'ACTIVE') {
        throw new Error('Persistent source and destination wallets must be distinct and active.');
      }
      const metadata = {
        ...(params.metadata ?? {}),
        ...(params.recipientName ? { recipientName: params.recipientName } : {}),
      };
      return financialRepository.createInternalTransferDraft({
        userId: params.userId,
        orgId: params.orgId,
        sourceWalletId: source.id,
        destinationWalletId: destination.id,
        amountMinor: params.amount,
        currency: params.currency,
        description: params.description,
        idempotencyKey: params.idempotencyKey,
        metadata,
      });
    }
    // Map-backed idempotency is reserved for legacy demo wallets only.
    if (scopedKey && db.idempotencyStore.has(scopedKey)) {
      const existingRecord = db.idempotencyStore.get(scopedKey)!;
      const tx = db.transactions.get(existingRecord.transactionId);
      if (tx && tx.userId === params.userId) {
        // An idempotency key identifies one immutable request, not merely one user.
        // Reject accidental or malicious reuse with different financial parameters.
        const sameRequest =
          tx.type === params.type &&
          tx.sourceWalletId === params.sourceWalletId &&
          tx.destinationWalletId === params.destinationWalletId &&
          tx.amount === params.amount &&
          tx.currency === params.currency &&
          tx.provider === params.provider &&
          tx.orgId === params.orgId &&
          tx.recipientName === params.recipientName &&
          tx.recipientAccount === params.recipientAccount &&
          tx.description === params.description &&
          JSON.stringify(tx.metadata ?? null) === JSON.stringify(params.metadata ?? null);
        if (!sameRequest) {
          throw new Error('Idempotency key has already been used with a different transaction payload.');
        }
        return tx;
      }
    }

    if (params.provider === 'INTERNAL' && params.currency !== 'USD') {
      throw new Error('Internal settlement is temporarily limited to USD until currency-specific ledger accounts are configured.');
    }
    if (params.provider === 'INTERNAL' && (!params.destinationWalletId || !params.destinationWalletId.trim())) {
      throw new Error('Internal transfers require an owned destination wallet. External disbursements must use a verified provider workflow.');
    }

    // Verify source wallet exists
    const sourceWallet = db.wallets.get(params.sourceWalletId);
    if (!sourceWallet) {
      throw new Error(`Source wallet '${params.sourceWalletId}' does not exist.`);
    }
    if (!canAccessWallet(sourceWallet, params.userId, params.orgId)) {
      throw new Error('Source wallet does not belong to the authenticated user or an active organization membership with transaction permission.');
    }
    if (sourceWallet.currency !== params.currency) {
      throw new Error('Transaction currency must match the source wallet currency.');
    }
    if (sourceWallet.status !== 'ACTIVE') throw new Error('Source wallet is not active.');

    if (params.destinationWalletId) {
      const destinationWallet = db.wallets.get(params.destinationWalletId);
      if (!destinationWallet) throw new Error('Destination wallet does not exist.');
      if (destinationWallet.id === sourceWallet.id) throw new Error('Source and destination wallets must be different.');
      if (destinationWallet.currency !== params.currency) throw new Error('Destination wallet currency must match the transaction currency.');
      if (destinationWallet.status !== 'ACTIVE') throw new Error('Destination wallet is not active.');
      if (!canAccessWallet(destinationWallet, params.userId, params.orgId)) {
        throw new Error('Destination wallet does not belong to the authenticated user or an active organization membership with transaction permission.');
      }
    }

    // Calculate indicative processing fee
    let fee = 0;
    if (params.provider === 'PAYPAL') {
      fee = Math.round(params.amount * 0.029) + 30; // 2.9% + 30c
    } else if (params.provider === 'SHWARY') {
      fee = Math.round(params.amount * 0.015); // 1.5%
    } else if (params.provider === 'EXCHANGE_DESK') {
      fee = Math.round(params.amount * 0.0075); // 0.75%
    }

    const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const now = new Date().toISOString();

    const transaction: Transaction = {
      id: txId,
      idempotencyKey: params.idempotencyKey,
      userId: params.userId,
      orgId: params.orgId,
      type: params.type,
      status: 'CREATED',
      sourceWalletId: params.sourceWalletId,
      destinationWalletId: params.destinationWalletId,
      amount: params.amount,
      fee,
      currency: params.currency,
      recipientName: params.recipientName,
      recipientAccount: params.recipientAccount,
      provider: params.provider,
      description: params.description,
      metadata: params.metadata,
      createdAt: now,
      updatedAt: now,
    };

    db.transactions.set(txId, transaction);

    if (scopedKey) {
      db.idempotencyStore.set(scopedKey, {
        transactionId: txId,
        response: transaction,
        createdAt: Date.now(),
      });
    }

    return transaction;
  }

  /**
   * Transition transaction to PENDING (user is presented preview, funds reserved)
   */
  static markPending(transactionId: string, requesterUserId?: string): Transaction {
    const financialRepository = getFinancialRepository();
    if (financialRepository.hasTransaction(transactionId)) {
      if (!requesterUserId) throw new Error('Authenticated transaction owner is required.');
      return financialRepository.markInternalTransactionPending(transactionId, requesterUserId);
    }
    const tx = db.transactions.get(transactionId);
    if (!tx) throw new Error(`Transaction '${transactionId}' not found.`);

    if (tx.status !== 'CREATED') {
      throw new Error(`Cannot transition to PENDING from status '${tx.status}'.`);
    }
    if (tx.provider !== 'INTERNAL') {
      throw new Error('External-provider transactions cannot be reserved by the generic engine. A verified provider workflow is required.');
    }
    if (!tx.destinationWalletId) {
      throw new Error('Internal transfers require a destination wallet before funds can be reserved.');
    }

    // Revalidate both wallet identities and tenant access at reservation time.
    const sourceWallet = db.wallets.get(tx.sourceWalletId);
    const destinationWallet = db.wallets.get(tx.destinationWalletId);
    if (!sourceWallet || sourceWallet.status !== 'ACTIVE' || !canAccessWallet(sourceWallet, tx.userId, tx.orgId)) {
      throw new Error('Source wallet is unavailable to this transaction tenant.');
    }
    if (sourceWallet.currency !== tx.currency) throw new Error('Source wallet currency mismatch.');
    if (!destinationWallet || destinationWallet.status !== 'ACTIVE' ||
        destinationWallet.currency !== tx.currency || destinationWallet.id === sourceWallet.id ||
        !canAccessWallet(destinationWallet, tx.userId, tx.orgId)) {
      throw new Error('Destination wallet is unavailable to this transaction tenant.');
    }
    WalletService.reservePendingDebit(tx.sourceWalletId, tx.amount + tx.fee);

    tx.status = 'PENDING';
    tx.updatedAt = new Date().toISOString();
    return tx;
  }

  /**
   * Confirm and execute transaction.
   * State machine: PENDING -> PROCESSING -> SUCCEEDED
   * Posts to Double-Entry Ledger and updates balances.
   */
  static executeTransaction(transactionId: string, requesterUserId?: string, providerRef?: string): Transaction {
    const financialRepository = getFinancialRepository();
    if (financialRepository.hasTransaction(transactionId)) {
      if (!requesterUserId) throw new Error('Authenticated transaction owner is required.');
      if (providerRef) throw new Error('Provider references cannot settle internal wallet transfers.');
      return financialRepository.executeInternalTransfer(transactionId, requesterUserId);
    }
    const tx = db.transactions.get(transactionId);
    if (!tx) throw new Error(`Transaction '${transactionId}' not found.`);

    if (tx.status !== 'PENDING') {
      throw new Error(`Execution requires a PENDING transaction; current status is '${tx.status}'.`);
    }
    if (tx.provider !== 'INTERNAL') {
      throw new Error('External-provider transactions cannot be settled by the generic execution engine. A verified provider confirmation is required.');
    }
    if (tx.currency !== 'USD') {
      throw new Error('Internal ledger settlement is temporarily limited to USD.');
    }

    if (!tx.destinationWalletId) {
      throw new Error('Internal settlement requires a destination wallet. External disbursements must use a verified provider settlement workflow.');
    }
    const destinationWalletId = tx.destinationWalletId;
    const sourceWallet = db.wallets.get(tx.sourceWalletId);
    const destinationWallet = db.wallets.get(destinationWalletId);
    const settlementTotal = tx.amount + tx.fee;
    if (!Number.isSafeInteger(settlementTotal)) throw new Error('Settlement total exceeds the safe integer range.');
    if (!sourceWallet || sourceWallet.status !== 'ACTIVE' || !canAccessWallet(sourceWallet, tx.userId, tx.orgId)) {
      throw new Error('Source wallet is unavailable to this transaction tenant.');
    }
    if (sourceWallet.currency !== tx.currency || sourceWallet.pendingDebits < settlementTotal ||
        sourceWallet.internalAccountingBalance < settlementTotal) {
      throw new Error('Reserved funds or wallet balance are inconsistent; settlement was stopped.');
    }
    if (!destinationWallet || destinationWallet.status !== 'ACTIVE' ||
        destinationWallet.currency !== tx.currency || destinationWallet.id === sourceWallet.id ||
        !Number.isSafeInteger(destinationWallet.internalAccountingBalance + tx.amount) ||
        !canAccessWallet(destinationWallet, tx.userId, tx.orgId)) {
      throw new Error('Destination wallet is unavailable to this transaction tenant or cannot accept this settlement.');
    }

    tx.status = 'PROCESSING';
    tx.updatedAt = new Date().toISOString();

    try {
      // 1. Post the balanced ledger batch first. All account and balance invariants
      // are validated before the wallet mutation; no provider is called here.
      LedgerEngine.postTransaction(tx.id, [
        {
          accountCode: '2010', // Customer deposit liability decreases by amount + fee
          entryType: 'DEBIT',
          amount: settlementTotal,
          currency: tx.currency,
          description: `Settlement: ${tx.description}`,
        },
        {
          accountCode: '2010', // Both sides are customer-wallet liabilities; no external cash payout is implied.
          entryType: 'CREDIT',
          amount: tx.amount,
          currency: tx.currency,
          description: `Disbursement for ${tx.description}`,
        },
        ...(tx.fee > 0
          ? [
              {
                accountCode: '4010', // Platform fee revenue increases
                entryType: 'CREDIT',
                amount: tx.fee,
                currency: tx.currency,
                description: `Fee: ${tx.description}`,
              } as const,
            ]
          : []),
      ]);

      // 2. Apply the corresponding wallet mutation after the ledger batch succeeds.
      WalletService.applySettledDebit(tx.sourceWalletId, settlementTotal);
      WalletService.applySettledCredit(destinationWalletId, tx.amount);

      tx.status = 'SUCCEEDED';
      if (providerRef) tx.providerReference = providerRef;
      tx.updatedAt = new Date().toISOString();

      return tx;
    } catch (err: any) {
      tx.status = 'FAILED';
      tx.failureReason = err.message || 'Execution error';
      tx.updatedAt = new Date().toISOString();
      // Release reservation
      WalletService.releasePendingDebit(tx.sourceWalletId, tx.amount + tx.fee);
      throw err;
    }
  }

  /**
   * Abort transaction before execution
   */
  static cancelTransaction(transactionId: string, reason: string, requesterUserId?: string): Transaction {
    const financialRepository = getFinancialRepository();
    if (financialRepository.hasTransaction(transactionId)) {
      if (!requesterUserId) throw new Error('Authenticated transaction owner is required.');
      return financialRepository.cancelInternalTransaction(transactionId, requesterUserId, reason);
    }
    const tx = db.transactions.get(transactionId);
    if (!tx) throw new Error(`Transaction '${transactionId}' not found.`);

    if (tx.status !== 'CREATED' && tx.status !== 'PENDING') {
      throw new Error(`Cannot cancel a transaction with status '${tx.status}'.`);
    }

    if (tx.status === 'PENDING') {
      WalletService.releasePendingDebit(tx.sourceWalletId, tx.amount + tx.fee);
    }

    tx.status = 'CANCELLED';
    tx.failureReason = reason;
    tx.updatedAt = new Date().toISOString();
    return tx;
  }

  /**
   * Refund a succeeded transaction with ledger reversal
   */
  static refundTransaction(transactionId: string, _reason: string): Transaction {
    const tx = db.transactions.get(transactionId);
    if (!tx) throw new Error(`Transaction '${transactionId}' not found.`);
    if (tx.status !== 'SUCCEEDED') {
      throw new Error(`Cannot refund transaction with status '${tx.status}'.`);
    }

    // The in-memory engine cannot atomically reverse every affected wallet projection.
    // Fail closed rather than crediting the source while leaving a destination credited.
    throw new Error('Refunds are disabled until persistent ledger reversal and all wallet projections can be committed atomically.');
  }
}
