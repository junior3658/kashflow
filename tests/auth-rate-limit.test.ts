import assert from 'node:assert/strict';
import { FixedWindowRateLimiter } from '../src/backend/auth/rate-limit';

export function testAuthRateLimiter() {
  console.log('--- RUNNING AUTH RATE-LIMITER TESTS ---');
  const limiter = new FixedWindowRateLimiter({ limit: 2, windowMs: 100, maxKeys: 3 });
  assert.equal(limiter.consume('ip-a', 1000), true);
  assert.equal(limiter.consume('ip-a', 1001), true);
  assert.equal(limiter.consume('ip-a', 1002), false);
  assert.equal(limiter.consume('ip-a', 1100), true);
  console.log('✓ Fixed-window limits reset at the expected boundary.');
  for (let index = 0; index < 20; index += 1) limiter.consume(`ip-${index}`, 1200);
  assert.ok(limiter.trackedKeys <= 3, 'Rate-limit state must remain bounded under unique-key churn.');
  console.log('✓ Unique-key churn cannot grow the in-process limiter beyond its configured capacity.');
}
