import Database from 'better-sqlite3';
import { randomBytes, scryptSync } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export async function testAuthVerificationConcurrency() {
  console.log('--- RUNNING AUTHENTICATION CONCURRENCY TESTS ---');

  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'kashflow-auth-test-'));
  const databasePath = path.join(directory, 'auth.sqlite');
  const previousDatabasePath = process.env.AUTH_DATABASE_PATH;
  process.env.AUTH_DATABASE_PATH = databasePath;

  try {
    const { verifyEmail } = await import('../src/backend/auth/store');
    const authDb = new Database(databasePath);
    const now = new Date().toISOString();

    const validUserId = 'usr_auth_concurrency_valid';
    const validEmail = 'auth-concurrency-valid@example.test';
    const validCode = '482915';
    const validCodeId = randomBytes(16).toString('hex');

    authDb.prepare(
      'INSERT INTO auth_users(id,email,full_name,password_hash,password_salt,created_at) VALUES(?,?,?,?,?,?)'
    ).run(validUserId, validEmail, 'Concurrency Test', 'unused', 'unused', now);
    authDb.prepare(
      'INSERT INTO verification_codes(id,user_id,code_hash,expires_at,created_at) VALUES(?,?,?,?,?)'
    ).run(
      validCodeId,
      validUserId,
      scryptSync(validCode, validCodeId, 64).toString('hex'),
      Date.now() + 600000,
      Date.now(),
    );

    const concurrentVerifications = await Promise.allSettled([
      verifyEmail(validEmail, validCode),
      verifyEmail(validEmail, validCode),
    ]);
    const successfulVerifications = concurrentVerifications.filter(
      (result) => result.status === 'fulfilled',
    ).length;
    if (successfulVerifications !== 1) {
      throw new Error(`Expected exactly one concurrent verification success; received ${successfulVerifications}.`);
    }

    const sessionCount = (authDb.prepare(
      'SELECT COUNT(*) AS count FROM auth_sessions WHERE user_id = ?'
    ).get(validUserId) as { count: number }).count;
    if (sessionCount !== 1) throw new Error('Concurrent code replay created an unexpected number of sessions.');
    console.log('✓ A verification code can be consumed only once under concurrent requests.');

    const limitedUserId = 'usr_auth_concurrency_limit';
    const limitedEmail = 'auth-concurrency-limit@example.test';
    const expectedCode = '739204';
    const limitedCodeId = randomBytes(16).toString('hex');

    authDb.prepare(
      'INSERT INTO auth_users(id,email,full_name,password_hash,password_salt,created_at) VALUES(?,?,?,?,?,?)'
    ).run(limitedUserId, limitedEmail, 'Attempt Limit Test', 'unused', 'unused', now);
    authDb.prepare(
      'INSERT INTO verification_codes(id,user_id,code_hash,expires_at,created_at) VALUES(?,?,?,?,?)'
    ).run(
      limitedCodeId,
      limitedUserId,
      scryptSync(expectedCode, limitedCodeId, 64).toString('hex'),
      Date.now() + 600000,
      Date.now(),
    );

    await Promise.allSettled(
      Array.from({ length: 10 }, () => verifyEmail(limitedEmail, '000000')),
    );
    const attempts = (authDb.prepare(
      'SELECT attempts FROM verification_codes WHERE id = ?'
    ).get(limitedCodeId) as { attempts: number }).attempts;
    if (attempts !== 5) {
      throw new Error(`Concurrent invalid codes should stop at five attempts; database recorded ${attempts}.`);
    }
    console.log('✓ Concurrent invalid codes cannot exceed the five-attempt limit.');

    authDb.close();
  } finally {
    if (previousDatabasePath === undefined) delete process.env.AUTH_DATABASE_PATH;
    else process.env.AUTH_DATABASE_PATH = previousDatabasePath;
  }
}
