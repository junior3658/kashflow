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
  assert.equal(limiter.trackedKeys, 3, 'Rate-limit state must remain within its configured capacity.');
  assert.equal(limiter.consume('ip-overflow', 1200), false, 'Unknown keys must fail closed at capacity.');
  assert.equal(limiter.consume('ip-overflow', 1300), true, 'Expired windows must free capacity for new keys.');
  assert.ok(limiter.trackedKeys <= 3);
  console.log('✓ Unique-key churn cannot evict active buckets; capacity fails closed until expiry.');
}
