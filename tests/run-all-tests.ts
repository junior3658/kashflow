/**
 * Comprehensive Test Runner for KASHFLOW
 * Runs Ledger, Multi-Agent AI, and 10 Security Audit Scenarios.
 */

import { testLedgerEngine } from './ledger.test';
import { testAIAgents } from './agents.test';
import { testSecurityAuditScenarios } from './audit-scenarios.test';
import { testTransactionSafety } from './transactions.test';
import { testAuthVerificationConcurrency } from './auth-verification.test';

async function runAll() {
  console.log('====================================================');
  console.log('       KASHFLOW FINANCIAL CORE & SECURITY TEST SUITE ');
  console.log('====================================================\n');

  try {
    await testLedgerEngine();
    await testAuthVerificationConcurrency();
    await testTransactionSafety();
    console.log('');
    await testAIAgents();
    console.log('');
    await testSecurityAuditScenarios();
    console.log('\n====================================================');
    console.log(' ALL TEST SUITES PASSED CLEANLY (100% INVARIANTS MET)');
    console.log('====================================================');
    process.exit(0);
  } catch (err: any) {
    console.error('\n❌ TEST SUITE FAILED:', err.message);
    process.exit(1);
  }
}

runAll();
