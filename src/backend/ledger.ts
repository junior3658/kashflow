/**
 * KASHFLOW Double-Entry Ledger Engine
 * Invariant: SUM(DEBITS) === SUM(CREDITS)
 * Immutable postings with auditable reversal entries.
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
  amount: number; // positive integer cents
  currency: Currency;
  description: string;
}

export class LedgerEngine {
  /**
   * Commit a balanced set of ledger entries atomically
   */
  static postTransaction(transactionId: string, entries: PostingBatchItem[]): LedgerEntry[] {
    if (!entries || entries.length === 0) {
      throw new Error('Cannot post an empty ledger transaction.');
    }

    // 1. Group by currency to enforce double-entry invariant per currency
    const amountsByCurrency: Record<string, { debits: number; credits: number }> = {};

    for (const item of entries) {
      if (item.amount <= 0) {
        throw new Error(`Invalid non-positive amount: ${item.amount}`);
      }

      const cur = item.currency;
      if (!amountsByCurrency[cur]) {
        amountsByCurrency[cur] = { debits: 0, credits: 0 };
      }

      if (item.entryType === 'DEBIT') {
        amountsByCurrency[cur].debits += item.amount;
      } else {
        amountsByCurrency[cur].credits += item.amount;
      }

      // Verify account exists
      if (!db.ledgerAccounts.has(item.accountCode)) {
        throw new Error(`Account code '${item.accountCode}' does not exist in chart of accounts.`);
      }
    }

    // 2. Validate invariant SUM(DEBITS) == SUM(CREDITS) for every currency
    for (const [cur, totals] of Object.entries(amountsByCurrency)) {
      if (totals.debits !== totals.credits) {
        throw new UnbalancedLedgerError(
          `Double-entry invariant violated for ${cur}: Total Debits (${totals.debits}) != Total Credits (${totals.credits})`,
          totals.debits,
          totals.credits
        );
      }
    }

    // 3. Atomically write entries and update account balances
    const timestamp = new Date().toISOString();
    const createdEntries: LedgerEntry[] = [];

    for (const item of entries) {
      const entryId = `le_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const entry: LedgerEntry = {
        id: entryId,
        transactionId,
        accountCode: item.accountCode,
        entryType: item.entryType,
        amount: item.amount,
        currency: item.currency,
        description: item.description,
        createdAt: timestamp,
      };

      db.ledgerEntries.push(entry);
      createdEntries.push(entry);

      // Update account cached balance
      const account = db.ledgerAccounts.get(item.accountCode)!;
      if (account.type === 'ASSET' || account.type === 'EXPENSE') {
        account.balance += item.entryType === 'DEBIT' ? item.amount : -item.amount;
      } else {
        // LIABILITY, EQUITY, REVENUE have normal credit balances
        account.balance += item.entryType === 'CREDIT' ? item.amount : -item.amount;
      }
    }

    return createdEntries;
  }

  /**
   * Reverse a previously posted transaction with balanced inverse entries
   */
  static reverseTransaction(originalTransactionId: string, reversalReason: string): LedgerEntry[] {
    const originalEntries = db.ledgerEntries.filter((e) => e.transactionId === originalTransactionId);
    if (originalEntries.length === 0) {
      throw new Error(`No ledger entries found for transaction '${originalTransactionId}' to reverse.`);
    }

    const inverseBatch: PostingBatchItem[] = originalEntries.map((e) => ({
      accountCode: e.accountCode,
      entryType: e.entryType === 'DEBIT' ? 'CREDIT' : 'DEBIT', // Invert
      amount: e.amount,
      currency: e.currency,
      description: `REVERSAL of ${e.id}: ${reversalReason}`,
    }));

    return this.postTransaction(`rev_${originalTransactionId}`, inverseBatch);
  }

  /**
   * Calculate Trial Balance across all accounts
   */
  static getTrialBalance(): {
    accounts: { code: string; name: string; currency: Currency; debits: number; credits: number }[];
    totalDebits: number;
    totalCredits: number;
    isBalanced: boolean;
  } {
    let totalDebits = 0;
    let totalCredits = 0;

    const accountSummaries = Array.from(db.ledgerAccounts.values()).map((acc) => {
      const entries = db.ledgerEntries.filter((e) => e.accountCode === acc.code);
      const debits = entries
        .filter((e) => e.entryType === 'DEBIT')
        .reduce((sum, e) => sum + e.amount, 0);
      const credits = entries
        .filter((e) => e.entryType === 'CREDIT')
        .reduce((sum, e) => sum + e.amount, 0);

      totalDebits += debits;
      totalCredits += credits;

      return {
        code: acc.code,
        name: acc.name,
        currency: acc.currency,
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
