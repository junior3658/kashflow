/**
 * KASHFLOW Wallets Service
 * Manages logical wallets with strict distinction between external provider balances,
 * internal ledger accounting balances, and pending reservations.
 */

import { db } from './db';
import { Wallet, Currency, WalletType } from './types';

export class InsufficientFundsError extends Error {
  constructor(available: number, requested: number, currency: Currency) {
    super(`Insufficient funds: Requested ${requested / 100} ${currency}, available ${available / 100} ${currency}`);
    this.name = 'InsufficientFundsError';
  }
}

export class WalletService {
  static getWalletsByOwner(ownerId: string, type?: WalletType): Wallet[] {
    const list = Array.from(db.wallets.values()).filter((w) => w.ownerId === ownerId);
    if (type) {
      return list.filter((w) => w.type === type);
    }
    return list;
  }

  static getWalletById(walletId: string): Wallet | null {
    return db.wallets.get(walletId) || null;
  }

  static reservePendingDebit(walletId: string, amount: number): Wallet {
    const wallet = db.wallets.get(walletId);
    if (!wallet) {
      throw new Error(`Wallet '${walletId}' not found.`);
    }

    const available = wallet.internalAccountingBalance - wallet.pendingDebits;
    if (available < amount) {
      throw new InsufficientFundsError(available, amount, wallet.currency);
    }

    wallet.pendingDebits += amount;
    wallet.updatedAt = new Date().toISOString();
    return wallet;
  }

  static releasePendingDebit(walletId: string, amount: number): Wallet {
    const wallet = db.wallets.get(walletId);
    if (!wallet) throw new Error(`Wallet '${walletId}' not found.`);
    wallet.pendingDebits = Math.max(0, wallet.pendingDebits - amount);
    wallet.updatedAt = new Date().toISOString();
    return wallet;
  }

  static applySettledDebit(walletId: string, amount: number): Wallet {
    const wallet = db.wallets.get(walletId);
    if (!wallet) throw new Error(`Wallet '${walletId}' not found.`);

    wallet.internalAccountingBalance -= amount;
    wallet.pendingDebits = Math.max(0, wallet.pendingDebits - amount);
    wallet.updatedAt = new Date().toISOString();
    return wallet;
  }

  static applySettledCredit(walletId: string, amount: number): Wallet {
    const wallet = db.wallets.get(walletId);
    if (!wallet) throw new Error(`Wallet '${walletId}' not found.`);

    wallet.internalAccountingBalance += amount;
    // A local ledger credit is not evidence of funds held by a payment provider.
    // externalProviderBalance is updated only by a verified provider reconciliation.
    wallet.updatedAt = new Date().toISOString();
    return wallet;
  }

  /**
   * Get consolidated portfolio total in USD across all user wallets
   */
  static getConsolidatedNetWorthUsd(ownerId: string): {
    totalUsd: number;
    wallets: Wallet[];
    ratesUsed: Record<Currency, number>;
  } {
    const userWallets = this.getWalletsByOwner(ownerId);
    // Fixed standard benchmark conversion rates
    const rates: Record<Currency, number> = {
      USD: 1.0,
      EUR: 1.08,
      CDF: 0.00035, // ~2850 CDF per 1 USD
    };

    let totalCents = 0;
    for (const w of userWallets) {
      const netCents = w.internalAccountingBalance;
      if (w.currency === 'USD') {
        totalCents += netCents;
      } else if (w.currency === 'EUR') {
        totalCents += netCents * rates.EUR;
      } else if (w.currency === 'CDF') {
        totalCents += netCents * rates.CDF;
      }
    }

    return {
      totalUsd: Math.round(totalCents) / 100,
      wallets: userWallets,
      ratesUsed: rates,
    };
  }
}
