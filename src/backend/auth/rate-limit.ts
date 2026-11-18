/**
 * Bounded fixed-window limiter for public authentication endpoints.
 * This per-process fallback must be paired with shared edge rate limiting in production.
 */
export interface FixedWindowRateLimiterOptions { limit: number; windowMs: number; maxKeys?: number; }
interface Bucket { count: number; resetAt: number; }

export class FixedWindowRateLimiter {
  private readonly buckets = new Map<string, Bucket>();
  private readonly maxKeys: number;

  constructor(private readonly options: FixedWindowRateLimiterOptions) {
    this.maxKeys = options.maxKeys ?? 5000;
    if (!Number.isSafeInteger(options.limit) || options.limit < 1) throw new Error('Rate limit must be a positive safe integer.');
    if (!Number.isSafeInteger(options.windowMs) || options.windowMs < 1) throw new Error('Rate-limit window must be a positive safe integer.');
    if (!Number.isSafeInteger(this.maxKeys) || this.maxKeys < 1) throw new Error('Rate-limit key capacity must be a positive safe integer.');
  }

  consume(key: string, now = Date.now()): boolean {
    if (!key) throw new Error('A rate-limit key is required.');
    const current = this.buckets.get(key);
    if (current && current.resetAt > now) {
      if (current.count >= this.options.limit) return false;
      current.count += 1;
      return true;
    }
    if (current) this.buckets.delete(key);
    let inspected = 0;
    for (const [candidate, bucket] of this.buckets) {
      if (bucket.resetAt <= now) this.buckets.delete(candidate);
      if (++inspected >= 64) break;
    }
    if (this.buckets.size >= this.maxKeys) {
      const oldestKey = this.buckets.keys().next().value;
      if (oldestKey !== undefined) this.buckets.delete(oldestKey);
    }
    this.buckets.set(key, { count: 1, resetAt: now + this.options.windowMs });
    return true;
  }

  get trackedKeys(): number { return this.buckets.size; }
}
