/**
 * Execution Runner for All 10 Security Audit Scenarios
 */

import { SecurityAuditSuite } from '../src/backend/security/audit-scenarios';

export async function testSecurityAuditScenarios() {
  console.log('--- RUNNING 10 SECURITY AUDIT SCENARIOS ---');
  const results = await SecurityAuditSuite.runAllScenarios();

  let failedCount = 0;
  for (const r of results) {
    const symbol = r.status === 'PASSED' ? '✓' : '✗';
    console.log(`${symbol} Scenario ${r.id}: ${r.title} [${r.status}] (${r.durationMs}ms)`);
    if (r.status !== 'PASSED') {
      failedCount++;
      console.error(`  Failure Details: ${r.details}`);
    }
  }

  if (failedCount > 0) {
    throw new Error(`${failedCount} of 10 security audit scenarios failed.`);
  }

  console.log(`✓ All 10 security audit scenarios passed with 100% adherence to invariants.`);
}
