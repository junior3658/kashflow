import { Request, Response, NextFunction } from 'express';
import { getSessionUserId, SESSION_COOKIE_NAME } from './store';
import { isSameOriginWrite } from './origin';

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function enforceSameOriginWrites(req: Request, res: Response, next: NextFunction) {
  // The callback currently has no settlement side effect and is exempt until its
  // provider-authentication contract is implemented. It must not be exempted once
  // a verified event processor is added.
  if (req.path === '/payments/shwary/callback') return next();
  if (!WRITE_METHODS.has(req.method)) return next();

  const origin = req.get('origin');
  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  if (!isSameOriginWrite(origin, appUrl)) {
    return res.status(403).json({ error: 'Cross-origin or origin-less write request rejected.' });
  }
  next();
}

export function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index < 0) continue;
    if (part.slice(0,index).trim() === name) {
      try { return decodeURIComponent(part.slice(index+1).trim()); }
      catch { return undefined; }
    }
  }
  return undefined;
}
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  // Provider callback is currently a no-op acknowledgement and has no settlement.
  if (req.path === '/payments/shwary/callback') return next();
  const userId = getSessionUserId(readCookie(req, SESSION_COOKIE_NAME));
  if (!userId) return res.status(401).json({ error: 'Authentication required.' });
  (req as any).userId = userId;
  next();
}
