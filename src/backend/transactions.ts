/**
 * KASHFLOW Transaction Engine
 * Implements strict state machine, idempotency control, and draft confirmation lifecycle.
 */

import { db } from './db';
import { Transaction, TransactionStatus, TransactionType, Currency } from './types';
import { WalletService } from './wallets';
import { LedgerEngine } from './ledger';

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
    if (params.idempotencyKey && db.idempotencyStore.has(params.idempotencyKey)) {
      const existingRecord = db.idempotencyStore.get(params.idempotencyKey)!;
      const tx = db.transactions.get(existingRecord.transactionId);
      if (tx) {
        return tx;
      }
    }

    if (params.amount <= 0) {
      throw new Error('Transaction amount must be strictly positive.');
    }

    // Verify source wallet exists
    const sourceWallet = db.wallets.get(params.sourceWalletId);
    if (!sourceWallet) {
      throw new Error(`Source wallet '${params.sourceWalletId}' does not exist.`);
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

    if (params.idempotencyKey) {
      db.idempotencyStore.set(params.idempotencyKey, {
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
  static markPending(transactionId: string): Transaction {
    const tx = db.transactions.get(transactionId);
    if (!tx) throw new Error(`Transaction '${transactionId}' not found.`);

    if (tx.status !== 'CREATED') {
      throw new Error(`Cannot transition to PENDING from status '${tx.status}'.`);
    }

    // Reserve funds in wallet
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
  static executeTransaction(transactionId: string, providerRef?: string): Transaction {
    const tx = db.transactions.get(transactionId);
    if (!tx) throw new Error(`Transaction '${transactionId}' not found.`);

    if (tx.status !== 'PENDING' && tx.status !== 'CREATED') {
      throw new Error(`Cannot execute transaction in status '${tx.status}'.`);
    }

    tx.status = 'PROCESSING';
    tx.updatedAt = new Date().toISOString();

    try {
      // 1. Settle balances
      WalletService.applySettledDebit(tx.sourceWalletId, tx.amount + tx.fee);
      if (tx.destinationWalletId && db.wallets.has(tx.destinationWalletId)) {
        WalletService.applySettledCredit(tx.destinationWalletId, tx.amount);
      }

      // 2. Commit balanced double-entry ledger entries
      LedgerEngine.postTransaction(tx.id, [
        {
          accountCode: '1010', // User Cash Account
          entryType: 'CREDIT',
          amount: tx.amount + tx.fee,
          currency: tx.currency,
          description: `Disbursement for ${tx.description}`,
        },
        {
          accountCode: '2010', // Liability Deposit
          entryType: 'DEBIT',
          amount: tx.amount,
          currency: tx.currency,
          description: `Settlement: ${tx.description}`,
        },
        ...(tx.fee > 0
          ? [
              {
                accountCode: '4010', // Fee Revenue
                entryType: 'DEBIT',
                amount: tx.fee,
                currency: tx.currency,
                description: `Fee: ${tx.description}`,
              } as const,
            ]
          : []),
      ]);

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
  static cancelTransaction(transactionId: string, reason: string): Transaction {
    const tx = db.transactions.get(transactionId);
    if (!tx) throw new Error(`Transaction '${transactionId}' not found.`);

    if (tx.status === 'SUCCEEDED') {
      throw new Error('Cannot cancel an already succeeded transaction. Use refund instead.');
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
  static refundTransaction(transactionId: string, reason: string): Transaction {
    const tx = db.transactions.get(transactionId);
    if (!tx) throw new Error(`Transaction '${transactionId}' not found.`);

    if (tx.status !== 'SUCCEEDED') {
      throw new Error(`Cannot refund transaction with status '${tx.status}'.`);
    }

    // 1. Ledger reversal
    LedgerEngine.reverseTransaction(tx.id, reason);

    // 2. Refund wallet balance
    WalletService.applySettledCredit(tx.sourceWalletId, tx.amount);

    tx.status = 'REFUNDED';
    tx.updatedAt = new Date().toISOString();
    return tx;
  }
}
