/**
 * KASHFLOW Permission-Aware Tool Layer
 * Exposes strictly controlled read-only query tools and non-executable draft builders to AI agents.
 * The AI layer NEVER has access to direct money movement or provider credentials.
 */

import { db } from '../db';
import { Currency, TransactionType } from '../types';
import { WalletService } from '../wallets';
import { CurrencyExchangeService } from '../providers/exchange';
import { ProviderRouter } from '../providers/router';
import { TransactionEngine } from '../transactions';

export class PermittedAITools {
  /**
   * Tool: get_wallet_balances
   */
  static getWalletBalances(userId: string, orgId?: string) {
    const personal = WalletService.getWalletsByOwner(userId, 'PERSONAL');
    const business = orgId ? WalletService.getWalletsByOwner(orgId, 'BUSINESS') : [];

    return {
      personalWallets: personal.map((w) => ({
        id: w.id,
        name: w.name,
        currency: w.currency,
        availableBalance: (w.internalAccountingBalance - w.pendingDebits) / 100,
        providerVerifiedBalance: w.externalProviderBalance / 100,
        pendingDebits: w.pendingDebits / 100,
      })),
      businessWallets: business.map((w) => ({
        id: w.id,
        name: w.name,
        currency: w.currency,
        availableBalance: (w.internalAccountingBalance - w.pendingDebits) / 100,
        providerVerifiedBalance: w.externalProviderBalance / 100,
        pendingDebits: w.pendingDebits / 100,
      })),
    };
  }

  /**
   * Tool: get_transactions
   */
  static getTransactions(userId: string, limit = 10) {
    const list = Array.from(db.transactions.values())
      .filter((tx) => tx.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);

    return list.map((tx) => ({
      id: tx.id,
      type: tx.type,
      status: tx.status,
      amount: tx.amount / 100,
      fee: tx.fee / 100,
      currency: tx.currency,
      recipientName: tx.recipientName,
      provider: tx.provider,
      description: tx.description,
      createdAt: tx.createdAt,
    }));
  }

  /**
   * Tool: get_exchange_rate
   */
  static getExchangeRate(from: Currency, to: Currency) {
    return CurrencyExchangeService.getRate(from, to);
  }

  /**
   * Tool: calculate_payment_fees
   */
  static calculatePaymentFees(amountCents: number, currency: Currency) {
    return ProviderRouter.getRouteOptions({
      type: 'TRANSFER',
      amountCents,
      currency,
    });
  }

  /**
   * Tool: create_transfer_draft
   * HARD INVARIANT: ONLY creates a non-executable draft.
   * Execution requires explicit user confirmation via backend endpoint!
   */
  static createTransferDraft(params: {
    userId: string;
    amount: number;
    currency: Currency;
    recipientName: string;
    recipientAccount?: string;
    sourceWalletId: string;
    provider: 'PAYPAL' | 'SHWARY' | 'INTERNAL';
  }) {
    const amountCents = Math.round(params.amount * 100);
    const draft = TransactionEngine.createDraft({
      userId: params.userId,
      type: 'TRANSFER',
      sourceWalletId: params.sourceWalletId,
      amount: amountCents,
      currency: params.currency,
      recipientName: params.recipientName,
      recipientAccount: params.recipientAccount,
      provider: params.provider,
      description: `Transfer to ${params.recipientName}`,
    });

    return {
      draftId: draft.id,
      status: 'DRAFT_CREATED_REQUIRES_USER_CONFIRMATION',
      amount: draft.amount / 100,
      fee: draft.fee / 100,
      totalDebit: (draft.amount + draft.fee) / 100,
      currency: draft.currency,
      recipient: draft.recipientName,
      provider: draft.provider,
    };
  }
}
