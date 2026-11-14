/**
 * Unit & Invariant Tests: Double-Entry Ledger & Wallets
 */

import { LedgerEngine, UnbalancedLedgerError } from '../src/backend/ledger';
import { db } from '../src/backend/db';
import { WalletService } from '../src/backend/wallets';

export async function testLedgerEngine() {
  console.log('--- RUNNING LEDGER TESTS ---');

  // Test 1: Succeeded balanced post
  const entries = LedgerEngine.postTransaction('tx_test_bal_01', [
    {
      accountCode: '1010',
      entryType: 'DEBIT',
      amount: 25000,
      currency: 'USD',
      description: 'Test debit deposit $250.00',
    },
    {
      accountCode: '2010',
      entryType: 'CREDIT',
      amount: 25000,
      currency: 'USD',
      description: 'Test liability deposit $250.00',
    },
  ]);

  if (entries.length !== 2) throw new Error('Expected 2 posted ledger entries');
  console.log('✓ Balanced posting test passed.');

  // A ledger transaction ID is append-only and cannot be posted twice.
  let duplicateRejected = false;
  try {
    LedgerEngine.postTransaction('tx_test_bal_01', [
      { accountCode: '1010', entryType: 'DEBIT', amount: 100, currency: 'USD', description: 'Duplicate' },
      { accountCode: '2010', entryType: 'CREDIT', amount: 100, currency: 'USD', description: 'Duplicate' },
    ]);
  } catch { duplicateRejected = true; }
  if (!duplicateRejected) throw new Error('Duplicate ledger transaction ID was accepted.');
  console.log('✓ Duplicate posting rejection passed.');

  // Account currency must match the currency of every posting.
  let currencyMismatchRejected = false;
  try {
    LedgerEngine.postTransaction('tx_test_currency_mismatch', [
      { accountCode: '1010', entryType: 'DEBIT', amount: 100, currency: 'EUR', description: 'Wrong currency' },
      { accountCode: '2010', entryType: 'CREDIT', amount: 100, currency: 'EUR', description: 'Wrong currency' },
    ]);
  } catch { currencyMismatchRejected = true; }
  if (!currencyMismatchRejected) throw new Error('Cross-currency ledger account posting was accepted.');
  console.log('✓ Ledger account currency validation passed.');

  let fractionalAmountRejected = false;
  try {
    LedgerEngine.postTransaction('tx_test_fractional_amount', [
      { accountCode: '1010', entryType: 'DEBIT', amount: 1.5, currency: 'USD', description: 'Fractional' },
      { accountCode: '2010', entryType: 'CREDIT', amount: 1.5, currency: 'USD', description: 'Fractional' },
    ]);
  } catch { fractionalAmountRejected = true; }
  if (!fractionalAmountRejected) throw new Error('Fractional minor-unit ledger amount was accepted.');
  console.log('✓ Integer minor-unit validation passed.');

  // A transfer fee reduces customer liability, decreases cash by the sent amount,
  // and increases platform fee revenue.
  const feeRevenueBefore = db.ledgerAccounts.get('4010')!.balance;
  const feeEntries = LedgerEngine.postTransaction('tx_test_fee_direction', [
    { accountCode: '2010', entryType: 'DEBIT', amount: 1030, currency: 'USD', description: 'Customer liability settlement' },
    { accountCode: '1010', entryType: 'CREDIT', amount: 1000, currency: 'USD', description: 'Cash disbursement' },
    { accountCode: '4010', entryType: 'CREDIT', amount: 30, currency: 'USD', description: 'Platform fee revenue' },
  ]);
  if (feeEntries[2].entryType !== 'CREDIT' || db.ledgerAccounts.get('4010')!.balance !== feeRevenueBefore + 30) {
    throw new Error('Platform fee revenue was not posted with its normal credit balance.');
  }
  console.log('✓ Fee revenue accounting direction passed.');

  // Test 2: Invariant enforcement on unbalanced entry
  let threw = false;
  try {
    LedgerEngine.postTransaction('tx_fail_unbal', [
      {
        accountCode: '1010',
        entryType: 'DEBIT',
        amount: 10000,
        currency: 'USD',
        description: 'Test debit $100',
      },
      {
        accountCode: '2010',
        entryType: 'CREDIT',
        amount: 8000, // Discrepancy
        currency: 'USD',
        description: 'Test credit $80',
      },
    ]);
  } catch (err: any) {
    if (err instanceof UnbalancedLedgerError || err.name === 'UnbalancedLedgerError') {
      threw = true;
    }
  }

  if (!threw) throw new Error('Unbalanced ledger posting failed to throw UnbalancedLedgerError');
  console.log('✓ Unbalanced ledger posting invariant rejection passed.');

  // Test 3: Trial balance in equilibrium
  const tb = LedgerEngine.getTrialBalance();
  if (!tb.isBalanced) throw new Error('Trial balance is out of equilibrium!');
  console.log(`✓ Trial balance verified: $${tb.totalDebits / 100} debits == $${tb.totalCredits / 100} credits.`);
}
