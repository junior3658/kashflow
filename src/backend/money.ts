/**
 * Exact USD amount parsing for API boundaries.
 *
 * Financial requests use decimal strings and are converted directly to integer
 * minor units. Floating-point multiplication/rounding is intentionally avoided.
 */
export function parseUsdMinorUnits(value: unknown): number | null {
  if (typeof value !== 'string' || value.length === 0 || value.trim() !== value) return null;

  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value);
  if (!match) return null;

  const whole = Number(match[1]);
  if (!Number.isSafeInteger(whole) || whole < 0) return null;

  const fraction = Number((match[2] ?? '').padEnd(2, '0') || '0');
  if (!Number.isSafeInteger(fraction) || fraction < 0 || fraction > 99) return null;
  if (whole > Math.floor((Number.MAX_SAFE_INTEGER - fraction) / 100)) return null;

  const minorUnits = whole * 100 + fraction;
  return Number.isSafeInteger(minorUnits) && minorUnits > 0 ? minorUnits : null;
}
