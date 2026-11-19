export function isSameOriginWrite(originHeader: string | undefined, appUrl: string): boolean {
  if (!originHeader || originHeader === 'null' || originHeader.trim() !== originHeader) return false;

  try {
    const requestOrigin = new URL(originHeader);
    const configuredOrigin = new URL(appUrl);
    // Origin headers contain only the origin, never a path or trailing slash.
    return originHeader === requestOrigin.origin && requestOrigin.origin === configuredOrigin.origin;
  } catch {
    return false;
  }
}
