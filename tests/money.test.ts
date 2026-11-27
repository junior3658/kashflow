import assert from 'node:assert/strict';
import { parseUsdMinorUnits } from '../src/backend/money';

export function testMoneyMinorUnits() {
  console.log('--- RUNNING EXACT MONEY PARSING TESTS ---');
  assert.equal(parseUsdMinorUnits('0.01'), 1);
  assert.equal(parseUsdMinorUnits('1'), 100);
  assert.equal(parseUsdMinorUnits('1.2'), 120);
  assert.equal(parseUsdMinorUnits('1.20'), 120);
  assert.equal(parseUsdMinorUnits('0001.20'), 120);
  assert.equal(parseUsdMinorUnits('90071992547409.91'), Number.MAX_SAFE_INTEGER);

  for (const invalid of [
    '', ' ', ' 1.00', '1.00 ', '-1.00', '+1.00', '0', '0.00',
    '1.005', '1.000', '1.', '.50', '1e2', 'Infinity',
    '90071992547409.92',
  ]) {
    assert.equal(parseUsdMinorUnits(invalid), null, `Expected ${JSON.stringify(invalid)} to be rejected`);
  }
  assert.equal(parseUsdMinorUnits(1.25), null);
  assert.equal(parseUsdMinorUnits(null), null);
  console.log('✓ Decimal strings convert exactly to integer minor units; excess precision and unsafe values are rejected.');
}
