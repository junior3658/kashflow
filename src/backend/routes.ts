/**
 * KASHFLOW REST API Route Handlers
 * Clean, modular endpoints under /api/v1/
 */

import { Router, Request, Response } from 'express';
import { db } from './db';
import { WalletService } from './wallets';
import { TransactionEngine } from './transactions';
import { shwaryAdapter } from './providers/shwary';
import { CurrencyExchangeService } from './providers/exchange';
import { CryptoSimulationService } from './providers/crypto';
import { ProviderRouter } from './providers/router';
import { AIOrchestrator } from './ai/orchestrator';
import { SecurityAuditSuite } from './security/audit-scenarios';
import { LedgerEngine } from './ledger';
import { getFinancialRepository } from './financial/repository';
import { parseUsdMinorUnits } from './money';
import { LLMProvider } from './ai/llm-provider';
import { registerAccount, verifyEmail, loginAccount, resendVerification, setSessionCookie, clearSessionCookie, revokeSession, publicUser, SESSION_COOKIE_NAME } from './auth/store';
import { enforceSameOriginWrites, requireAuth, readCookie } from './auth/middleware';
import { FixedWindowRateLimiter } from './auth/rate-limit';

export const apiRouter = Router();

// Apply CSRF/origin validation before both public auth and authenticated writes.
apiRouter.use(enforceSameOriginWrites);

// Public authentication endpoints. This bounded per-process limiter is a
// prototype safeguard; production must also enforce a shared edge/IP rate limit.
const authRateLimiter = new FixedWindowRateLimiter({ limit: 10, windowMs: 15 * 60_000, maxKeys: 5000 });
function authThrottle(req: Request, res: Response, next: any) {
  const key = req.ip || req.socket.remoteAddress || 'unknown';
  if (!authRateLimiter.consume(key)) return res.status(429).json({ error: 'Too many attempts. Please try again later.' });
  next();
}

apiRouter.post('/auth/register', authThrottle, async (req: Request, res: Response) => {
  try {
    const { fullName, email, password, accountType, businessName } = req.body || {};
    if (typeof fullName !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Full name, email and password are required.' });
    }
    if (accountType !== undefined && accountType !== 'PERSONAL' && accountType !== 'BUSINESS') return res.status(400).json({ error: 'Choose a personal or business account.' });
    if (businessName !== undefined && typeof businessName !== 'string') return res.status(400).json({ error: 'Business name must be text.' });
    await registerAccount({ fullName, email, password, accountType, businessName });
    res.status(201).json({ success: true, message: 'Verification email sent.' });
  } catch (error: any) { res.status(400).json({ error: error.message || 'Registration failed.' }); }
});

apiRouter.post('/auth/verify-email', authThrottle, async (req: Request, res: Response) => {
  try {
    const { email, code } = req.body || {};
    if (typeof email !== 'string' || typeof code !== 'string') return res.status(400).json({ error: 'Email and verification code are required.' });
    const token = await verifyEmail(email, code);
    setSessionCookie(res, token);
    res.json({ success: true });
  } catch (error: any) { res.status(400).json({ error: error.message || 'Verification failed.' }); }
});

apiRouter.post('/auth/resend-verification', authThrottle, async (req: Request, res: Response) => {
  try {
    if (typeof req.body?.email !== 'string') return res.status(400).json({ error: 'Email is required.' });
    await resendVerification(req.body.email);
    res.json({ success: true, message: 'If the account needs verification, an email will be sent.' });
  } catch (error: any) { res.status(400).json({ error: error.message || 'Unable to send verification email.' }); }
});

apiRouter.post('/auth/login', authThrottle, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body || {};
    if (typeof email !== 'string' || typeof password !== 'string') return res.status(400).json({ error: 'Email and password are required.' });
    const token = await loginAccount(email, password);
    setSessionCookie(res, token);
    res.json({ success: true });
  } catch (error: any) { res.status(401).json({ error: error.message || 'Sign in failed.' }); }
});

apiRouter.post('/auth/logout', (req: Request, res: Response) => {
  revokeSession(readCookie(req, SESSION_COOKIE_NAME));
  clearSessionCookie(res);
  res.json({ success: true });
});

// All remaining application endpoints require a valid, verified session.
// The Shwary provider callback is explicitly exempted in requireAuth and does not
// settle funds until its signature/event contract is implemented.
apiRouter.use(requireAuth);
apiRouter.use('/admin', (req: Request, res: Response, next: any) => {
  const user = db.users.get((req as any).userId);
  if (!user || user.role !== 'PLATFORM_ADMIN') return res.status(403).json({ error: 'Platform administrator access required.' });
  next();
});
apiRouter.use('/audit', (req: Request, res: Response, next: any) => {
  const user = db.users.get((req as any).userId);
  if (!user || user.role !== 'PLATFORM_ADMIN') return res.status(403).json({ error: 'Platform administrator access required.' });
  next();
});

apiRouter.get('/auth/me', (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const user = publicUser(userId);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });
  const runtimeUser = db.users.get(userId);
  const org = runtimeUser?.currentOrgId ? db.organizations.get(runtimeUser.currentOrgId) : null;
  res.json({ user, organization: org });
});

// -------------------------------------------------------------
// 2. WALLETS & BALANCES
// -------------------------------------------------------------
apiRouter.get('/wallets', (req: Request, res: Response) => {
  const type = req.query.type;
  const userId = (req as any).userId as string;
  const user = db.users.get(userId);
  if (!user) return res.status(401).json({ error: 'Authenticated runtime user not found.' });
  if (type !== undefined && type !== 'PERSONAL' && type !== 'BUSINESS') {
    return res.status(400).json({ error: 'Wallet type must be PERSONAL or BUSINESS.' });
  }
  if (type === 'BUSINESS' && !user.currentOrgId) {
    return res.status(403).json({ error: 'This account has no business organization.' });
  }
  const ownerType = type === 'BUSINESS' ? 'ORGANIZATION' as const : 'USER' as const;
  const ownerId = type === 'BUSINESS' ? user.currentOrgId! : userId;
  const walletType = type as 'PERSONAL' | 'BUSINESS' | undefined;
  let wallets;
  try {
    wallets = getFinancialRepository().getWalletsByOwner(ownerType, ownerId, userId, walletType);
  } catch (error) {
    return res.status(403).json({ error: error instanceof Error ? error.message : 'Wallet access denied.' });
  }
  // Legacy demo data remains read-only fallback for personal accounts not provisioned
  // in the financial database. Business wallets never fall back to the in-memory map.
  if (type !== 'BUSINESS' && wallets.length === 0) {
    wallets = WalletService.getWalletsByOwner(ownerId, walletType);
  }
  const consolidated = WalletService.getConsolidatedNetWorthUsd(ownerId, wallets);
  const hasSimulatedWallets = wallets.some((wallet) => wallet.isSimulated === true);
  const hasLegacyUnverifiedWallets = wallets.some((wallet) => wallet.isSimulated === undefined);
  const walletBalanceProvenance = hasSimulatedWallets
    ? 'SIMULATED_DEMO'
    : hasLegacyUnverifiedWallets ? 'LEGACY_UNVERIFIED' : 'PERSISTENT_LEDGER';
  res.json({
    wallets,
    consolidatedNetWorthUsd: consolidated.totalUsd,
    consolidatedNetWorthBasis: hasSimulatedWallets
      ? 'SIMULATED_DEMO_LEDGER'
      : hasLegacyUnverifiedWallets ? 'LEGACY_UNVERIFIED_LEDGER' : 'ESTIMATED_FROM_INTERNAL_LEDGER',
    walletBalanceProvenance,
    isConsolidatedNetWorthEstimated: true,
    isConsolidatedNetWorthSimulated: hasSimulatedWallets,
    providerBalancesVerified: wallets.length > 0 && wallets.every((wallet) => wallet.externalProviderBalanceStatus === 'VERIFIED'),
  });
});

// -------------------------------------------------------------
// 3. TRANSACTIONS
// -------------------------------------------------------------
apiRouter.get('/transactions', (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  res.json({ transactions: getFinancialRepository().getTransactionsByUser(userId) });
});

apiRouter.get('/transactions/:id', (req: Request, res: Response) => {
  const tx = getFinancialRepository().getTransactionForUser(req.params.id, (req as any).userId);
  if (!tx) return res.status(404).json({ error: 'Transaction not found' });
  res.json({ transaction: tx });
});

apiRouter.post('/transfers/draft', (req: Request, res: Response) => {
  try {
    const { amount, currency, recipientName, recipientAccount, sourceWalletId, destinationWalletId, provider, idempotencyKey } = req.body || {};
    const userId = (req as any).userId as string;
    if (provider && provider !== 'INTERNAL') {
      return res.status(409).json({ error: 'External providers must use their dedicated verified payment flow; generic transfer confirmation cannot settle them.' });
    }
    if (typeof destinationWalletId !== 'string' || !destinationWalletId.trim()) {
      return res.status(409).json({ error: 'Internal transfers require a destination wallet ID. External beneficiaries must use a verified provider workflow.' });
    }
    if (typeof recipientAccount === 'string' && recipientAccount.trim()) {
      return res.status(409).json({ error: 'External beneficiary accounts cannot be routed through internal wallet transfers.' });
    }
    if (currency && currency !== 'USD') {
      return res.status(409).json({ error: 'Internal transfers are temporarily limited to USD while currency-specific ledger accounts are completed.' });
    }
    const amountCents = parseUsdMinorUnits(amount);
    if (amountCents === null) {
      return res.status(400).json({ error: 'Amount must be a positive decimal string with at most two fractional digits.' });
    }
    if (typeof idempotencyKey !== 'string' || idempotencyKey.length < 1 ||
        idempotencyKey.length > 128 || idempotencyKey.trim() !== idempotencyKey) {
      return res.status(400).json({ error: 'A valid Idempotency-Key is required for internal transfers.' });
    }
    const currentOrgId = db.users.get(userId)?.currentOrgId;
    const ownedWallet = (() => {
      try {
        return getFinancialRepository().getWalletForTransaction(sourceWalletId, userId, currentOrgId);
      } catch {
        return null;
      }
    })();
    if (!ownedWallet || (ownedWallet.type !== 'PERSONAL' && ownedWallet.type !== 'BUSINESS')) {
      return res.status(403).json({ error: 'Source wallet is not available to this account.' });
    }
    const draft = TransactionEngine.createDraft({
      idempotencyKey,
      userId,
      orgId: ownedWallet.type === 'BUSINESS' ? currentOrgId : undefined,
      type: 'TRANSFER',
      sourceWalletId: ownedWallet.id,
      destinationWalletId: destinationWalletId.trim(),
      amount: amountCents,
      currency: 'USD',
      recipientName: typeof recipientName === 'string' ? recipientName.slice(0, 100) : 'Beneficiary',
      recipientAccount: typeof recipientAccount === 'string' ? recipientAccount.slice(0, 160) : undefined,
      provider: 'INTERNAL',
      description: `Transfer to ${typeof recipientName === 'string' ? recipientName.slice(0, 100) : 'Beneficiary'}`,
    });
    const pendingDraft = draft.status === 'CREATED'
      ? TransactionEngine.markPending(draft.id, userId)
      : draft;
    res.status(201).json({ draft: pendingDraft });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/transfers/:id/confirm', (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId as string;
    const existing = getFinancialRepository().getTransactionForUser(req.params.id, userId);
    if (!existing) return res.status(404).json({ error: 'Transaction not found.' });
    const tx = TransactionEngine.executeTransaction(req.params.id, userId);
    res.json({ success: true, transaction: tx });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/transfers/:id/cancel', (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId as string;
    const existing = getFinancialRepository().getTransactionForUser(req.params.id, userId);
    if (!existing) return res.status(404).json({ error: 'Transaction not found.' });
    const reason = typeof req.body?.reason === 'string' ? req.body.reason : 'User cancelled';
    const tx = TransactionEngine.cancelTransaction(req.params.id, reason, userId);
    res.json({ success: true, transaction: tx });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 4. PAYPAL INTEGRATION
// -------------------------------------------------------------
apiRouter.post('/payments/paypal/orders', (_req: Request, res: Response) => {
  // The current adapter returns a simulated order and approval URL; it does not
  // create an order with PayPal. Keep this endpoint disabled to avoid presenting
  // a mock checkout as a real payment flow.
  res.status(503).json({
    error: 'PayPal checkout is disabled until real OAuth, order creation, ownership persistence, webhook verification and reconciliation are implemented.',
  });
});

apiRouter.post('/payments/paypal/capture', (_req: Request, res: Response) => {
  // The current prototype does not persist PayPal order ownership or implement
  // a verified capture-to-ledger settlement workflow. Do not capture funds.
  res.status(503).json({
    error: 'PayPal capture is disabled until order ownership, verified capture records, idempotency and atomic ledger settlement are implemented.',
  });
});

// -------------------------------------------------------------
// 5. SHWARY INTEGRATION
// -------------------------------------------------------------
apiRouter.get('/payments/shwary/capabilities', (req: Request, res: Response) => {
  res.json(shwaryAdapter.getCapabilities());
});

// Shwary callback endpoint. The supplied sample does not document callback
// signatures or event schema, so this endpoint deliberately does not settle funds.
apiRouter.post('/payments/shwary/callback', (req: Request, res: Response) => {
  res.status(202).json({
    received: true,
    verified: false,
    settlementApplied: false,
    message: 'Callback received for manual/provider-side verification. No wallet or ledger balance was changed.',
  });
});

apiRouter.post('/payments/shwary/encashment', async (req: Request, res: Response) => {
  try {
    const { amount, currency, phone } = req.body;
    const numericAmount = Number(amount);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ error: 'A positive amount is required.' });
    }
    if (currency !== 'CDF') {
      return res.status(400).json({ error: 'The currently documented Shwary DRC collection flow supports CDF only.' });
    }
    if (typeof phone !== 'string' || !phone.trim()) {
      return res.status(400).json({ error: 'A customer phone number is required.' });
    }

    const result = await shwaryAdapter.requestEncashment({
      amountCents: Math.round(numericAmount * 100),
      currency: 'CDF',
      customerPhone: phone,
    });

    // An HTTP 2xx response only acknowledges the collection request.
    // Do not credit the wallet or mark the transaction SUCCEEDED here.
    res.status(202).json(result);
  } catch (err: any) {
    res.status(502).json({ error: err.message || 'Shwary collection request failed.' });
  }
});

// -------------------------------------------------------------
// 6. PROVIDER ROUTING & QUOTES
// -------------------------------------------------------------
apiRouter.post('/payments/routes', (req: Request, res: Response) => {
  const { amount, currency, destinationType } = req.body;
  const options = ProviderRouter.getRouteOptions({
    type: 'TRANSFER',
    amountCents: Math.round(Number(amount) * 100),
    currency: currency || 'USD',
    destinationType,
  });
  res.json({ options });
});

// -------------------------------------------------------------
// 7. CURRENCY EXCHANGE
// -------------------------------------------------------------
apiRouter.get('/exchange/rates', (req: Request, res: Response) => {
  const usdToEur = CurrencyExchangeService.getRate('USD', 'EUR');
  const usdToCdf = CurrencyExchangeService.getRate('USD', 'CDF');
  const eurToCdf = CurrencyExchangeService.getRate('EUR', 'CDF');
  res.json({ rates: { 'USD/EUR': usdToEur, 'USD/CDF': usdToCdf, 'EUR/CDF': eurToCdf } });
});

apiRouter.post('/exchange/quote', (req: Request, res: Response) => {
  try {
    const { from, to, amount } = req.body;
    const quote = CurrencyExchangeService.createQuote(from, to, Math.round(Number(amount) * 100));
    res.json({ quote });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/exchange/execute', (_req: Request, res: Response) => {
  // Quote calculation is available for demonstration, but this endpoint previously
  // mutated wallet balances and marked a transaction SUCCEEDED without a balanced
  // ledger posting, durable idempotency or an atomic reservation/settlement.
  res.status(503).json({
    error: 'Exchange settlement is disabled until quote ownership, expiry validation, idempotency and atomic double-entry ledger settlement are implemented.',
  });
});

// -------------------------------------------------------------
// 8. CRYPTO SIMULATION
// -------------------------------------------------------------
apiRouter.get('/crypto/markets', (req: Request, res: Response) => {
  res.json({ markets: CryptoSimulationService.getMarkets() });
});

apiRouter.get('/crypto/portfolio', (req: Request, res: Response) => {
  res.json(CryptoSimulationService.getPortfolio((req as any).userId));
});

apiRouter.post('/crypto/trade', (req: Request, res: Response) => {
  try {
    const { symbol, side, amountUsd } = req.body;
    const numericAmount = Number(amountUsd);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0 || !['BUY', 'SELL'].includes(side)) {
      return res.status(400).json({ error: 'A positive amount and valid trade side are required.' });
    }
    const position = CryptoSimulationService.executeSimulatedTrade((req as any).userId, symbol, side, numericAmount);
    res.json({ success: true, position });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 9. KASH AI MULTI-AGENT CHAT & INTELLIGENCE
// -------------------------------------------------------------
apiRouter.get('/ai/history', (req: Request, res: Response) => {
  res.json({ messages: AIOrchestrator.getConversationHistory((req as any).userId) });
});

apiRouter.post('/ai/chat', async (req: Request, res: Response) => {
  try {
    const { message } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message content is required.' });
    }

    const user = db.users.get((req as any).userId)!;
    const responseMessage = await AIOrchestrator.processUserMessage({
      userId: user.id,
      orgId: user.currentOrgId,
      content: message,
    });

    res.json({ message: responseMessage });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/ai/clear', (req: Request, res: Response) => {
  AIOrchestrator.clearHistory((req as any).userId);
  res.json({ success: true });
});

// -------------------------------------------------------------
// 10. AUDIT & SYSTEM HEALTH
// -------------------------------------------------------------
apiRouter.get('/audit/logs', (req: Request, res: Response) => {
  res.json({ logs: db.auditLogs.filter((log) => log.actorUserId === (req as any).userId) });
});

apiRouter.get('/admin/health', (req: Request, res: Response) => {
  const trialBalance = LedgerEngine.getTrialBalance();
  const aiTelemetry = LLMProvider.getTelemetry();

  res.json({
    status: 'PROTOTYPE',
    version: '0.0.0-prototype',
    timestamp: new Date().toISOString(),
    ledger: {
      isBalanced: trialBalance.isBalanced,
      totalDebitsUsd: trialBalance.totalDebits / 100,
      totalCreditsUsd: trialBalance.totalCredits / 100,
    },
    providers: {
      paypal: { status: 'DISABLED', mode: 'NOT_CONNECTED' },
      shwary: { status: shwaryAdapter.isConfigured() ? 'CONFIGURED' : 'NOT_CONFIGURED', mode: shwaryAdapter.getCapabilities().encashment.mode, boundary: 'SETTLEMENT_VERIFICATION_REQUIRED' },
      exchangeDesk: { status: 'QUOTES_ONLY', settlement: 'DISABLED_PENDING_LEDGER_WORKFLOW' },
      cryptoSimulation: { status: 'ONLINE', mode: 'SIMULATED' },
    },
    aiTelemetry,
  });
});

apiRouter.post('/audit/run-scenarios', async (req: Request, res: Response) => {
  try {
    const results = await SecurityAuditSuite.runAllScenarios();
    res.json({ results });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
