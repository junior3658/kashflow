import Database from 'better-sqlite3';
import { randomBytes, randomUUID, randomInt, scrypt as scryptCb, createHash, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';
import { db } from '../db';
import { sendVerificationEmail } from './email';

const scrypt = promisify(scryptCb);
const COOKIE = 'kashflow_session';
const SESSION_MS = 7 * 86400000;
const CODE_MS = 600000;
const dbPath = path.resolve(process.env.AUTH_DATABASE_PATH || 'data/kashflow-auth.sqlite');

fs.mkdirSync(path.dirname(dbPath), { recursive: true });
const sql = new Database(dbPath);
sql.pragma('journal_mode = WAL');
sql.pragma('foreign_keys = ON');
sql.exec(`
CREATE TABLE IF NOT EXISTS auth_users(
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  full_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  verified_at TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS verification_codes(
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  consumed_at INTEGER,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_codes_user ON verification_codes(user_id, created_at);
CREATE TABLE IF NOT EXISTS auth_sessions(
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON auth_sessions(expires_at);
`);

const emailNorm = (value: string) => value.trim().toLowerCase();
const sha = (value: string) => createHash('sha256').update(value).digest('hex');

async function passwordHash(password: string, salt: string) {
  return (await scrypt(password, salt, 64)).toString('hex');
}

function session(userId: string) {
  const token = randomBytes(32).toString('base64url');
  const now = Date.now();
  sql.prepare('DELETE FROM auth_sessions WHERE expires_at <= ?').run(now);
  sql.prepare('INSERT INTO auth_sessions VALUES(?,?,?,?)').run(sha(token), userId, now + SESSION_MS, now);
  return token;
}

export function setSessionCookie(res: any, token: string) {
  res.cookie(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MS,
  });
}

export function clearSessionCookie(res: any) {
  res.clearCookie(COOKIE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
}

export function getSessionUserId(token?: string) {
  if (!token) return null;
  const record = sql.prepare(
    'SELECT user_id FROM auth_sessions WHERE token_hash = ? AND expires_at > ?'
  ).get(sha(token), Date.now()) as any;
  return record?.user_id || null;
}

export function revokeSession(token?: string) {
  if (token) sql.prepare('DELETE FROM auth_sessions WHERE token_hash = ?').run(sha(token));
}

function addRuntimeUser(user: any) {
  db.users.set(user.id, {
    id: user.id,
    email: user.email,
    fullName: user.full_name,
    role: 'PERSONAL_USER',
    createdAt: user.created_at,
  });

  for (const currency of ['USD', 'EUR', 'CDF'] as const) {
    const id = `wlt_${user.id}_${currency.toLowerCase()}`;
    if (!db.wallets.has(id)) {
      db.wallets.set(id, {
        id,
        ownerId: user.id,
        type: 'PERSONAL',
        currency,
        name: `Primary ${currency} Wallet`,
        internalAccountingBalance: 0,
        externalProviderBalance: 0,
        pendingDebits: 0,
        pendingCredits: 0,
        status: 'ACTIVE',
        createdAt: user.created_at,
        updatedAt: user.created_at,
      });
    }
  }
}

for (const user of sql.prepare(
  'SELECT id, email, full_name, created_at FROM auth_users WHERE verified_at IS NOT NULL'
).all() as any[]) {
  addRuntimeUser(user);
}

async function sendCode(user: any) {
  const now = Date.now();
  const last = sql.prepare(
    'SELECT created_at FROM verification_codes WHERE user_id = ? ORDER BY created_at DESC LIMIT 1'
  ).get(user.id) as any;

  if (last && now - last.created_at < 60000) {
    throw new Error('Please wait before requesting another verification email.');
  }

  const code = String(randomInt(0, 1000000)).padStart(6, '0');
  const id = randomBytes(16).toString('hex');
  const codeHash = await passwordHash(code, id);

  sql.prepare(
    'INSERT INTO verification_codes(id, user_id, code_hash, expires_at, created_at) VALUES(?,?,?,?,?)'
  ).run(id, user.id, codeHash, now + CODE_MS, now);

  await sendVerificationEmail({
    to: user.email,
    fullName: user.full_name,
    code,
    expiresInMinutes: 10,
  });
}

export async function registerAccount(value: { fullName: string; email: string; password: string }) {
  const name = value.fullName.trim();
  const email = emailNorm(value.email);

  if (name.length < 2 || name.length > 100) throw new Error('Enter a valid full name.');
  if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email) || email.length > 254) {
    throw new Error('Enter a valid email address.');
  }
  if (value.password.length < 10 || value.password.length > 128) {
    throw new Error('Password must contain 10 to 128 characters.');
  }
  if (sql.prepare('SELECT 1 FROM auth_users WHERE email = ?').get(email)) {
    throw new Error('Unable to create this account. Check the email or sign in.');
  }

  const id = 'usr_' + randomUUID();
  const salt = randomBytes(16).toString('hex');
  const createdAt = new Date().toISOString();
  const hash = await passwordHash(value.password, salt);

  try {
    sql.prepare(
      'INSERT INTO auth_users(id, email, full_name, password_hash, password_salt, created_at) VALUES(?,?,?,?,?,?)'
    ).run(id, email, name, hash, salt, createdAt);
  } catch (error: any) {
    if (error?.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      throw new Error('Unable to create this account. Check the email or sign in.');
    }
    throw error;
  }

  try {
    await sendCode({ id, email, full_name: name });
  } catch (error) {
    sql.prepare('DELETE FROM auth_users WHERE id = ?').run(id);
    throw error;
  }
}

export async function verifyEmail(emailInput: string, code: string) {
  const email = emailNorm(emailInput);
  if (!/^\\d{6}$/.test(code)) throw new Error('Invalid or expired verification code.');

  const user = sql.prepare(
    'SELECT id, email, full_name, created_at, verified_at FROM auth_users WHERE email = ?'
  ).get(email) as any;

  if (!user || user.verified_at) throw new Error('Invalid or expired verification code.');

  const verification = sql.prepare(
    'SELECT id, code_hash, expires_at, attempts FROM verification_codes WHERE user_id = ? AND consumed_at IS NULL ORDER BY created_at DESC LIMIT 1'
  ).get(user.id) as any;

  if (!verification || verification.expires_at <= Date.now() || verification.attempts >= 5) {
    throw new Error('Invalid or expired verification code.');
  }

  const actual = Buffer.from(await passwordHash(code, verification.id), 'hex');
  const expected = Buffer.from(verification.code_hash, 'hex');

  if (!timingSafeEqual(actual, expected)) {
    // Conditional SQL update makes the five-attempt limit safe under concurrent requests.
    sql.prepare(`
      UPDATE verification_codes
      SET attempts = attempts + 1
      WHERE id = ? AND user_id = ? AND consumed_at IS NULL
        AND expires_at > ? AND attempts < 5
    `).run(verification.id, user.id, Date.now());
    throw new Error('Invalid or expired verification code.');
  }

  // Consume the code and verify the account in one SQLite transaction. Two concurrent
  // requests may both finish scrypt, but only one can change consumed_at from NULL.
  const consumeAndVerify = sql.transaction(() => {
    const consumed = sql.prepare(`
      UPDATE verification_codes
      SET consumed_at = ?
      WHERE id = ? AND user_id = ? AND consumed_at IS NULL
        AND expires_at > ? AND attempts < 5
    `).run(Date.now(), verification.id, user.id, Date.now());

    if (consumed.changes !== 1) return false;

    const verified = sql.prepare(
      'UPDATE auth_users SET verified_at = ? WHERE id = ? AND verified_at IS NULL'
    ).run(new Date().toISOString(), user.id);

    if (verified.changes !== 1) {
      throw new Error('Invalid or expired verification code.');
    }
    return true;
  });

  if (!consumeAndVerify()) throw new Error('Invalid or expired verification code.');

  addRuntimeUser(user);
  return session(user.id);
}

export async function resendVerification(emailInput: string) {
  const user = sql.prepare(
    'SELECT id, email, full_name, verified_at FROM auth_users WHERE email = ?'
  ).get(emailNorm(emailInput)) as any;

  if (user && !user.verified_at) await sendCode(user);
}

export async function loginAccount(emailInput: string, password: string) {
  if (typeof password !== 'string' || password.length < 1 || password.length > 128) {
    throw new Error('Email or password is incorrect.');
  }

  const user = sql.prepare(
    'SELECT id, password_hash, password_salt, verified_at FROM auth_users WHERE email = ?'
  ).get(emailNorm(emailInput)) as any;

  if (!user) {
    await passwordHash(password, randomBytes(16).toString('hex'));
    throw new Error('Email or password is incorrect.');
  }

  const actual = Buffer.from(await passwordHash(password, user.password_salt), 'hex');
  const expected = Buffer.from(user.password_hash, 'hex');

  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    throw new Error('Email or password is incorrect.');
  }
  if (!user.verified_at) throw new Error('Verify your email before signing in.');

  return session(user.id);
}

export function publicUser(id: string) {
  const user = sql.prepare(
    'SELECT id, email, full_name, created_at FROM auth_users WHERE id = ? AND verified_at IS NOT NULL'
  ).get(id) as any;

  return user ? {
    id: user.id,
    email: user.email,
    fullName: user.full_name,
    role: 'PERSONAL_USER',
    createdAt: user.created_at,
  } : null;
}

export const SESSION_COOKIE_NAME = COOKIE;
