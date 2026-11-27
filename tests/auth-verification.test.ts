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
  const previousFinancialDatabasePath = process.env.FINANCIAL_DATABASE_PATH;
  process.env.AUTH_DATABASE_PATH = databasePath;
  process.env.FINANCIAL_DATABASE_PATH = path.join(directory, 'financial.sqlite');

  try {
    const now = new Date().toISOString();
    const revokedBusinessUserId = 'usr_auth_revoked_business_owner';
    const revokedBusinessOrgId = `org_${revokedBusinessUserId}`;
    const revokedBusinessEmail = 'revoked-business-owner@example.test';
    const revokedBusinessPassword = 'Revoked-Owner-Login-Password-123!';
    const revokedBusinessSalt = randomBytes(16).toString('hex');

    const { getFinancialRepository } = await import('../src/backend/financial/repository');
    const financialRepository = getFinancialRepository();
    financialRepository.provisionPersonalWallets(revokedBusinessUserId, now);
    financialRepository.provisionBusinessWallet(
      revokedBusinessUserId, revokedBusinessOrgId, 'Revoked Business Workspace', now,
    );
    if (!financialRepository.revokeOrganizationMembership(revokedBusinessUserId, revokedBusinessOrgId)) {
      throw new Error('Could not prepare a revoked business-owner membership fixture.');
    }

    // Seed a verified BUSINESS account before importing auth/store so the module's
    // startup hydration exercises the same revoked-membership path as production.
    const seedAuthDb = new Database(databasePath);
    seedAuthDb.exec(`
      CREATE TABLE auth_users(
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE COLLATE NOCASE,
        full_name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        password_salt TEXT NOT NULL,
        verified_at TEXT,
        created_at TEXT NOT NULL,
        account_type TEXT NOT NULL DEFAULT 'PERSONAL',
        business_name TEXT
      )
    `);
    seedAuthDb.prepare(
      'INSERT INTO auth_users(id,email,full_name,password_hash,password_salt,verified_at,created_at,account_type,business_name) VALUES(?,?,?,?,?,?,?,?,?)'
    ).run(
      revokedBusinessUserId,
      revokedBusinessEmail,
      'Revoked Business Owner',
      scryptSync(revokedBusinessPassword, revokedBusinessSalt, 64).toString('hex'),
      revokedBusinessSalt,
      now,
      now,
      'BUSINESS',
      'Revoked Business Workspace',
    );
    seedAuthDb.close();

    const { verifyEmail, loginAccount, getSessionUserId, publicUser } = await import('../src/backend/auth/store');
    const { db } = await import('../src/backend/db');
    const revokedBusinessToken = await loginAccount(revokedBusinessEmail, revokedBusinessPassword);
    if (getSessionUserId(revokedBusinessToken) !== revokedBusinessUserId) {
      throw new Error('A revoked business workspace incorrectly prevented personal account authentication.');
    }
    if (db.users.get(revokedBusinessUserId)?.currentOrgId !== undefined) {
      throw new Error('A revoked business workspace remained in the runtime authorization context.');
    }
    const revokedBusinessProfile = publicUser(revokedBusinessUserId);
    if (!revokedBusinessProfile || 'organizationId' in revokedBusinessProfile ||
        financialRepository.hasActiveMembership(revokedBusinessUserId, revokedBusinessOrgId)) {
      throw new Error('A revoked business organization was exposed as active in the public profile.');
    }
    if (financialRepository.getWalletsByOwner('USER', revokedBusinessUserId, revokedBusinessUserId, 'PERSONAL').length !== 3) {
      throw new Error('Personal wallets were not retained when business membership was revoked.');
    }
    console.log('✓ Revoked business membership blocks organization access without blocking personal login.');

    const authDb = new Database(databasePath);
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

    const malformedUserId = 'usr_auth_malformed_hash';
    const malformedEmail = 'auth-malformed-hash@example.test';
    const malformedCodeId = randomBytes(16).toString('hex');
    authDb.prepare(
      'INSERT INTO auth_users(id,email,full_name,password_hash,password_salt,created_at) VALUES(?,?,?,?,?,?)'
    ).run(malformedUserId, malformedEmail, 'Malformed Hash Test', 'unused', 'unused', now);
    authDb.prepare(
      'INSERT INTO verification_codes(id, user_id, code_hash, expires_at, created_at) VALUES(?,?,?,?,?)'
    ).run(malformedCodeId, malformedUserId, '00', Date.now() + 600000, Date.now());
    let malformedHashRejected = false;
    try { await verifyEmail(malformedEmail, '123456'); }
    catch (error) {
      if (error instanceof RangeError) throw error;
      malformedHashRejected = true;
    }
    const malformedAttempts = (authDb.prepare(
      'SELECT attempts FROM verification_codes WHERE id = ?'
    ).get(malformedCodeId) as { attempts: number }).attempts;
    if (!malformedHashRejected || malformedAttempts !== 1) {
      throw new Error('Malformed stored verification hashes must fail as an invalid code and consume one attempt.');
    }
    console.log('✓ Malformed stored verification hashes fail closed without throwing a length-related runtime error.');

    const previousFetch = globalThis.fetch;
    const previousResendApiKey = process.env.RESEND_API_KEY;
    const previousResendFrom = process.env.RESEND_FROM_EMAIL;
    const previousAppUrl = process.env.APP_URL;
    process.env.RESEND_API_KEY = 're_test_only';
    process.env.RESEND_FROM_EMAIL = 'KASHFLOW <test@example.test>';
    process.env.APP_URL = 'http://localhost:3000';

    try {
      const { resendVerification } = await import('../src/backend/auth/store');
      const resendUserId = 'usr_auth_resend_concurrency';
      const resendEmail = 'auth-resend-concurrency@example.test';
      authDb.prepare(
        'INSERT INTO auth_users(id,email,full_name,password_hash,password_salt,created_at) VALUES(?,?,?,?,?,?)'
      ).run(resendUserId, resendEmail, 'Resend Concurrency Test', 'unused', 'unused', now);

      globalThis.fetch = async () => ({
        ok: true,
        status: 200,
        json: async () => ({ id: 'resend-test-message' }),
      } as Response);

      await Promise.all([
        resendVerification(resendEmail),
        resendVerification(resendEmail),
      ]);
      const issuedCodes = (authDb.prepare(
        'SELECT COUNT(*) AS count FROM verification_codes WHERE user_id = ? AND consumed_at IS NULL'
      ).get(resendUserId) as { count: number }).count;
      if (issuedCodes !== 1) {
        throw new Error(`Concurrent resend requests should issue one active code; database recorded ${issuedCodes}.`);
      }
      console.log('✓ Concurrent resend requests issue only one active verification code.');

      const failedDeliveryUserId = 'usr_auth_resend_delivery_failure';
      const failedDeliveryEmail = 'auth-resend-failure@example.test';
      authDb.prepare(
        'INSERT INTO auth_users(id,email,full_name,password_hash,password_salt,created_at) VALUES(?,?,?,?,?,?)'
      ).run(failedDeliveryUserId, failedDeliveryEmail, 'Resend Delivery Failure Test', 'unused', 'unused', now);

      globalThis.fetch = async () => ({
        ok: false,
        status: 503,
        json: async () => ({ message: 'temporary provider failure' }),
      } as Response);

      let deliveryFailureObserved = false;
      try {
        await resendVerification(failedDeliveryEmail);
      } catch {
        deliveryFailureObserved = true;
      }
      if (!deliveryFailureObserved) throw new Error('A failed email delivery was not surfaced to the caller.');
      const undeliveredCodes = (authDb.prepare(
        'SELECT COUNT(*) AS count FROM verification_codes WHERE user_id = ? AND consumed_at IS NULL'
      ).get(failedDeliveryUserId) as { count: number }).count;
      if (undeliveredCodes !== 0) {
        throw new Error('A verification code remained usable after email delivery failed.');
      }
      console.log('✓ Failed email delivery removes the undelivered verification code.');
    } finally {
      globalThis.fetch = previousFetch;
      if (previousResendApiKey === undefined) delete process.env.RESEND_API_KEY;
      else process.env.RESEND_API_KEY = previousResendApiKey;
      if (previousResendFrom === undefined) delete process.env.RESEND_FROM_EMAIL;
      else process.env.RESEND_FROM_EMAIL = previousResendFrom;
      if (previousAppUrl === undefined) delete process.env.APP_URL;
      else process.env.APP_URL = previousAppUrl;
    }

    authDb.close();
  } finally {
    if (previousDatabasePath === undefined) delete process.env.AUTH_DATABASE_PATH;
    else process.env.AUTH_DATABASE_PATH = previousDatabasePath;
    if (previousFinancialDatabasePath === undefined) delete process.env.FINANCIAL_DATABASE_PATH;
    else process.env.FINANCIAL_DATABASE_PATH = previousFinancialDatabasePath;
  }
}
