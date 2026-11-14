/**
 * KASHFLOW Double-Entry Ledger Engine
 * Invariant: SUM(DEBITS) === SUM(CREDITS) for each currency.
 * Posted entries are append-only; corrections use reversal batches.
 */

import { db } from './db';
import { LedgerEntry, Currency } from './types';

export class UnbalancedLedgerError extends Error {
  constructor(message: string, public totalDebit: number, public totalCredit: number) {
    super(message);
    this.name = 'UnbalancedLedgerError';
  }
}

export interface PostingBatchItem {
  accountCode: string;
  entryType: 'DEBIT' | 'CREDIT';
  amount: number; // positive integer in minor currency units
  currency: Currency;
  description: string;
}

export class LedgerEngine {
  /**
   * Commit a balanced set of ledger entries after validating the entire batch.
   * A transaction ID may be posted only once; reversals use their own ID.
   */
  static postTransaction(transactionId: string, entries: PostingBatchItem[]): LedgerEntry[] {
    if (!transactionId || transactionId.trim() !== transactionId) {
      throw new Error('A valid ledger transaction ID is required.');
    }
    if (!entries || entries.length === 0) {
      throw new Error('Cannot post an empty ledger transaction.');
    }
    if (db.ledgerEntries.some((entry) => entry.transactionId === transactionId)) {
      throw new Error(`Ledger transaction '${transactionId}' has already been posted.`);
    }

    const amountsByCurrency: Record<string, { debits: number; credits: number }> = {};
    const balanceDeltas = new Map<string, number>();

    // Preflight every entry before mutating the ledger or account balances.
    for (const item of entries) {
      if (!Number.isSafeInteger(item.amount) || item.amount <= 0) {
        throw new Error(`Ledger amount must be a positive safe integer: ${item.amount}`);
      }

      const account = db.ledgerAccounts.get(item.accountCode);
      if (!account) {
        throw new Error(`Account code '${item.accountCode}' does not exist in chart of accounts.`);
      }
      if (account.currency !== item.currency) {
        throw new Error(`Currency mismatch for ledger account '${item.accountCode}'.`);
      }

      const totals = amountsByCurrency[item.currency] ?? { debits: 0, credits: 0 };
      if (item.entryType === 'DEBIT') totals.debits += item.amount;
      else totals.credits += item.amount;
      if (!Number.isSafeInteger(totals.debits) || !Number.isSafeInteger(totals.credits)) {
        throw new Error('Ledger batch total exceeds the safe integer range.');
      }
      amountsByCurrency[item.currency] = totals;

      const increasesWithDebit = account.type === 'ASSET' || account.type === 'EXPENSE';
      const delta = item.entryType === (increasesWithDebit ? 'DEBIT' : 'CREDIT')
        ? item.amount
        : -item.amount;
      balanceDeltas.set(item.accountCode, (balanceDeltas.get(item.accountCode) ?? 0) + delta);
    }

    for (const [currency, totals] of Object.entries(amountsByCurrency)) {
      if (totals.debits !== totals.credits) {
        throw new UnbalancedLedgerError(
          `Double-entry invariant violated for ${currency}: Total Debits (${totals.debits}) != Total Credits (${totals.credits})`,
          totals.debits,
          totals.credits,
        );
      }
    }

    for (const [accountCode, delta] of balanceDeltas) {
      const account = db.ledgerAccounts.get(accountCode)!;
      if (!Number.isSafeInteger(account.balance + delta)) {
        throw new Error(`Ledger account '${accountCode}' balance would exceed the safe integer range.`);
      }
    }

    const timestamp = new Date().toISOString();
    const createdEntries: LedgerEntry[] = entries.map((item) => ({
      id: `le_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      transactionId,
      accountCode: item.accountCode,
      entryType: item.entryType,
      amount: item.amount,
      currency: item.currency,
      description: item.description,
      createdAt: timestamp,
    }));

    // All validation is complete; apply the append-only batch and its projections.
    db.ledgerEntries.push(...createdEntries);
    for (const [accountCode, delta] of balanceDeltas) {
      db.ledgerAccounts.get(accountCode)!.balance += delta;
    }

    return createdEntries;
  }

  /**
   * Reverse a previously posted transaction with balanced inverse entries.
   */
  static reverseTransaction(originalTransactionId: string, reversalReason: string): LedgerEntry[] {
    const originalEntries = db.ledgerEntries.filter(
      (entry) => entry.transactionId === originalTransactionId,
    );
    if (originalEntries.length === 0) {
      throw new Error(`No ledger entries found for transaction '${originalTransactionId}' to reverse.`);
    }

    const inverseBatch: PostingBatchItem[] = originalEntries.map((entry) => ({
      accountCode: entry.accountCode,
      entryType: entry.entryType === 'DEBIT' ? 'CREDIT' : 'DEBIT',
      amount: entry.amount,
      currency: entry.currency,
      description: `REVERSAL of ${entry.id}: ${reversalReason}`,
    }));

    return this.postTransaction(`rev_${originalTransactionId}`, inverseBatch);
  }

  /**
   * Calculate Trial Balance across all accounts.
   */
  static getTrialBalance(): {
    accounts: { code: string; name: string; currency: Currency; debits: number; credits: number }[];
    totalDebits: number;
    totalCredits: number;
    isBalanced: boolean;
  } {
    let totalDebits = 0;
    let totalCredits = 0;

    const accountSummaries = Array.from(db.ledgerAccounts.values()).map((account) => {
      const accountEntries = db.ledgerEntries.filter((entry) => entry.accountCode === account.code);
      const debits = accountEntries
        .filter((entry) => entry.entryType === 'DEBIT')
        .reduce((sum, entry) => sum + entry.amount, 0);
      const credits = accountEntries
        .filter((entry) => entry.entryType === 'CREDIT')
        .reduce((sum, entry) => sum + entry.amount, 0);

      totalDebits += debits;
      totalCredits += credits;

      return {
        code: account.code,
        name: account.name,
        currency: account.currency,
        debits,
        credits,
      };
    });

    return {
      accounts: accountSummaries,
      totalDebits,
      totalCredits,
      isBalanced: totalDebits === totalCredits,
    };
  }
}
