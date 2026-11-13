import { Request, Response, NextFunction } from 'express';
import { getSessionUserId, SESSION_COOKIE_NAME } from './store';

export function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index < 0) continue;
    if (part.slice(0,index).trim() === name) return decodeURIComponent(part.slice(index+1).trim());
  }
  return undefined;
}
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  // Provider callbacks are machine-to-machine endpoints and have their own verification boundary.
  if (req.path === '/payments/shwary/callback') return next();
  const userId = getSessionUserId(readCookie(req, SESSION_COOKIE_NAME));
  if (!userId) return res.status(401).json({ error: 'Authentication required.' });
  (req as any).userId = userId;
  next();
}
