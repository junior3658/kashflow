/**
 * KASHFLOW REST API Route Handlers
 * Clean, modular endpoints under /api/v1/
 */

import { Router, Request, Response } from 'express';
import { db } from './db';
import { WalletService } from './wallets';
import { TransactionEngine } from './transactions';
import { paypalAdapter } from './providers/paypal';
import { shwaryAdapter } from './providers/shwary';
import { CurrencyExchangeService } from './providers/exchange';
import { CryptoSimulationService } from './providers/crypto';
import { ProviderRouter } from './providers/router';
import { AIOrchestrator } from './ai/orchestrator';
import { SecurityAuditSuite } from './security/audit-scenarios';
import { LedgerEngine } from './ledger';
import { LLMProvider } from './ai/llm-provider';

export const apiRouter = Router();

// Current active authenticated session user (defaulting to Junior)
let currentSessionUserId = 'usr_junior_01';

// -------------------------------------------------------------
// 1. AUTH & IDENTITY
// -------------------------------------------------------------
apiRouter.get('/auth/me', (req: Request, res: Response) => {
  const user = db.users.get(currentSessionUserId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const org = user.currentOrgId ? db.organizations.get(user.currentOrgId) : null;
  res.json({ user, organization: org });
});

apiRouter.post('/auth/switch-role', (req: Request, res: Response) => {
  const { role, orgId } = req.body;
  const user = db.users.get(currentSessionUserId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (role) user.role = role;
  if (orgId !== undefined) user.currentOrgId = orgId;
  res.json({ success: true, user });
});

// -------------------------------------------------------------
// 2. WALLETS & BALANCES
// -------------------------------------------------------------
apiRouter.get('/wallets', (req: Request, res: Response) => {
  const type = req.query.type as any;
  const user = db.users.get(currentSessionUserId)!;
  const ownerId = type === 'BUSINESS' && user.currentOrgId ? user.currentOrgId : user.id;
  const wallets = WalletService.getWalletsByOwner(ownerId, type);
  const consolidated = WalletService.getConsolidatedNetWorthUsd(ownerId);
  res.json({ wallets, consolidatedNetWorthUsd: consolidated.totalUsd });
});

// -------------------------------------------------------------
// 3. TRANSACTIONS
// -------------------------------------------------------------
apiRouter.get('/transactions', (req: Request, res: Response) => {
  const list = Array.from(db.transactions.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  res.json({ transactions: list });
});

apiRouter.get('/transactions/:id', (req: Request, res: Response) => {
  const tx = db.transactions.get(req.params.id);
  if (!tx) return res.status(404).json({ error: 'Transaction not found' });
  res.json({ transaction: tx });
});

apiRouter.post('/transfers/draft', (req: Request, res: Response) => {
  try {
    const { amount, currency, recipientName, recipientAccount, sourceWalletId, provider, idempotencyKey } = req.body;
    const amountCents = Math.round(Number(amount) * 100);
    const draft = TransactionEngine.createDraft({
      idempotencyKey,
      userId: currentSessionUserId,
      type: 'TRANSFER',
      sourceWalletId: sourceWalletId || 'wlt_personal_usd',
      amount: amountCents,
      currency: currency || 'USD',
      recipientName: recipientName || 'Beneficiary',
      recipientAccount,
      provider: provider || 'INTERNAL',
      description: `Transfer to ${recipientName || 'Beneficiary'}`,
    });
    res.json({ draft });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/transfers/:id/confirm', (req: Request, res: Response) => {
  try {
    const tx = TransactionEngine.executeTransaction(req.params.id);
    res.json({ success: true, transaction: tx });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/transfers/:id/cancel', (req: Request, res: Response) => {
  try {
    const tx = TransactionEngine.cancelTransaction(req.params.id, req.body.reason || 'User cancelled');
    res.json({ success: true, transaction: tx });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 4. PAYPAL INTEGRATION
// -------------------------------------------------------------
apiRouter.post('/payments/paypal/orders', async (req: Request, res: Response) => {
  try {
    const { amount, currency, description } = req.body;
    const amountCents = Math.round(Number(amount) * 100);
    const order = await paypalAdapter.createOrder({
      amountCents,
      currency: currency || 'USD',
      description: description || 'PayPal Payment to KASHFLOW',
    });
    res.json(order);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/payments/paypal/capture', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.body;
    const capture = await paypalAdapter.captureOrder(orderId);

    // Record verified transaction in KASHFLOW ledger
    const tx = TransactionEngine.createDraft({
      userId: currentSessionUserId,
      type: 'PAYPAL_PAYMENT',
      sourceWalletId: 'paypal_ext_buyer',
      destinationWalletId: 'wlt_personal_usd',
      amount: capture.amount,
      currency: capture.currency,
      provider: 'PAYPAL',
      description: `PayPal Capture ${capture.captureId}`,
    });

    const settled = TransactionEngine.executeTransaction(tx.id, capture.captureId);
    res.json({ capture, transaction: settled });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 5. SHWARY INTEGRATION
// -------------------------------------------------------------
apiRouter.get('/payments/shwary/capabilities', (req: Request, res: Response) => {
  res.json(shwaryAdapter.getCapabilities());
});

apiRouter.post('/payments/shwary/encashment', async (req: Request, res: Response) => {
  try {
    const { amount, currency, phone, operator } = req.body;
    const result = await shwaryAdapter.requestEncashment({
      amountCents: Math.round(Number(amount) * 100),
      currency: currency || 'CDF',
      customerPhone: phone || '+243810000000',
      operator: operator || 'vodacom',
      reference: `ENC-${Date.now()}`,
    });
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
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

apiRouter.post('/exchange/execute', (req: Request, res: Response) => {
  try {
    const { from, to, amount } = req.body;
    const amountCents = Math.round(Number(amount) * 100);
    const quote = CurrencyExchangeService.createQuote(from, to, amountCents);

    const sourceWallet = Array.from(db.wallets.values()).find(
      (w) => w.ownerId === currentSessionUserId && w.currency === from
    );
    const destWallet = Array.from(db.wallets.values()).find(
      (w) => w.ownerId === currentSessionUserId && w.currency === to
    );

    if (!sourceWallet || !destWallet) {
      return res.status(400).json({ error: `Wallets for exchange pair ${from} -> ${to} not configured.` });
    }

    // Debit source
    WalletService.applySettledDebit(sourceWallet.id, amountCents);
    // Credit destination with converted amount
    WalletService.applySettledCredit(destWallet.id, quote.toAmount);

    const tx = TransactionEngine.createDraft({
      userId: currentSessionUserId,
      type: 'EXCHANGE',
      sourceWalletId: sourceWallet.id,
      destinationWalletId: destWallet.id,
      amount: amountCents,
      currency: from,
      provider: 'EXCHANGE_DESK',
      description: `Exchange ${amount} ${from} to ${to}`,
    });
    tx.status = 'SUCCEEDED';

    res.json({ success: true, quote, transaction: tx });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 8. CRYPTO SIMULATION
// -------------------------------------------------------------
apiRouter.get('/crypto/markets', (req: Request, res: Response) => {
  res.json({ markets: CryptoSimulationService.getMarkets() });
});

apiRouter.get('/crypto/portfolio', (req: Request, res: Response) => {
  res.json(CryptoSimulationService.getPortfolio());
});

apiRouter.post('/crypto/trade', (req: Request, res: Response) => {
  try {
    const { symbol, side, amountUsd } = req.body;
    const position = CryptoSimulationService.executeSimulatedTrade(symbol, side, Number(amountUsd));
    res.json({ success: true, position });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 9. KASH AI MULTI-AGENT CHAT & INTELLIGENCE
// -------------------------------------------------------------
apiRouter.get('/ai/history', (req: Request, res: Response) => {
  res.json({ messages: AIOrchestrator.getConversationHistory() });
});

apiRouter.post('/ai/chat', async (req: Request, res: Response) => {
  try {
    const { message } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message content is required.' });
    }

    const user = db.users.get(currentSessionUserId)!;
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
  AIOrchestrator.clearHistory();
  res.json({ success: true });
});

// -------------------------------------------------------------
// 10. AUDIT & SYSTEM HEALTH
// -------------------------------------------------------------
apiRouter.get('/audit/logs', (req: Request, res: Response) => {
  res.json({ logs: db.auditLogs });
});

apiRouter.get('/admin/health', (req: Request, res: Response) => {
  const trialBalance = LedgerEngine.getTrialBalance();
  const aiTelemetry = LLMProvider.getTelemetry();

  res.json({
    status: 'HEALTHY',
    version: '1.0.0-production',
    timestamp: new Date().toISOString(),
    ledger: {
      isBalanced: trialBalance.isBalanced,
      totalDebitsUsd: trialBalance.totalDebits / 100,
      totalCreditsUsd: trialBalance.totalCredits / 100,
    },
    providers: {
      paypal: { status: 'ONLINE', mode: 'SANDBOX' },
      shwary: { status: 'ONLINE', boundary: 'QUARANTINE_ACTIVE' },
      exchangeDesk: { status: 'ONLINE' },
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
