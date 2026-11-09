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
