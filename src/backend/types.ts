/**
 * KASHFLOW Core Type Definitions
 * Strict types for Double-Entry Ledger, Wallets, Transactions, RBAC, Providers, and Multi-Agent AI
 */

export type Currency = 'USD' | 'EUR' | 'CDF';

export type UserRole =
  | 'PERSONAL_USER'
  | 'BUSINESS_OWNER'
  | 'BUSINESS_ADMIN'
  | 'BUSINESS_EMPLOYEE'
  | 'PLATFORM_ADMIN';

export interface User {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  role: UserRole;
  currentOrgId?: string;
  createdAt: string;
}

export interface Organization {
  id: string;
  name: string;
  taxId?: string;
  ownerUserId: string;
  currency: Currency;
  status: 'ACTIVE' | 'SUSPENDED';
  createdAt: string;
}

export interface Membership {
  id: string;
  orgId: string;
  userId: string;
  role: 'OWNER' | 'ADMIN' | 'EMPLOYEE';
  permissions: string[];
}

export type WalletType = 'PERSONAL' | 'BUSINESS' | 'ESCROW' | 'SETTLEMENT';

export interface Wallet {
  id: string;
  ownerId: string; // userId or orgId
  type: WalletType;
  currency: Currency;
  name: string;
  // Clear distinction of financial balances
  internalAccountingBalance: number; // In cents / base units
  externalProviderBalance: number;   // Verified from external rails
  pendingDebits: number;
  pendingCredits: number;
  isSimulated?: boolean;
  status: 'ACTIVE' | 'FROZEN';
  createdAt: string;
  updatedAt: string;
}

export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';

export interface LedgerAccount {
  code: string;
  name: string;
  type: AccountType;
  currency: Currency;
  balance: number; // in cents
}

export interface LedgerEntry {
  id: string;
  transactionId: string;
  accountCode: string;
  entryType: 'DEBIT' | 'CREDIT';
  amount: number; // positive integer in cents
  currency: Currency;
  description: string;
  createdAt: string;
}

export type TransactionStatus =
  | 'CREATED'
  | 'PENDING'
  | 'PROCESSING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'CANCELLED'
  | 'REFUNDED';

export type TransactionType =
  | 'TRANSFER'
  | 'PAYPAL_PAYMENT'
  | 'SHWARY_ENCASHMENT'
  | 'SHWARY_PAYOUT'
  | 'EXCHANGE'
  | 'CRYPTO_SIM_BUY'
  | 'CRYPTO_SIM_SELL'
  | 'REFUND';

export interface Transaction {
  id: string;
  idempotencyKey?: string;
  userId: string;
  orgId?: string;
  type: TransactionType;
  status: TransactionStatus;
  sourceWalletId: string;
  destinationWalletId?: string;
  amount: number; // in cents
  fee: number;    // in cents
  currency: Currency;
  recipientName?: string;
  recipientAccount?: string;
  provider: 'INTERNAL' | 'PAYPAL' | 'SHWARY' | 'EXCHANGE_DESK' | 'CRYPTO_SIM';
  providerReference?: string;
  description: string;
  metadata?: Record<string, any>;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExchangeQuote {
  quoteId: string;
  fromCurrency: Currency;
  toCurrency: Currency;
  rate: number;
  fromAmount: number;
  toAmount: number;
  fee: number;
  expiresAt: string;
  createdAt: string;
}

export interface CryptoAsset {
  symbol: 'BTC' | 'ETH' | 'USDT';
  name: string;
  priceUsd: number;
  change24h: number;
  high24h: number;
  low24h: number;
  sparkline: number[];
  isSimulated: true;
}

export interface CryptoPosition {
  symbol: 'BTC' | 'ETH' | 'USDT';
  amount: number;
  averageBuyPriceUsd: number;
  currentValueUsd: number;
  pnlUsd: number;
  pnlPercent: number;
  isSimulated: true;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actorUserId: string;
  actorEmail: string;
  action: string;
  resourceType: string;
  resourceId: string;
  ipAddress?: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  details: Record<string, any>;
}

export interface AIIntentExtraction {
  intent:
    | 'balance_inquiry'
    | 'transaction_history'
    | 'payment_request'
    | 'transfer_request'
    | 'currency_conversion'
    | 'crypto_information'
    | 'expense_analysis'
    | 'transaction_explanation'
    | 'provider_comparison'
    | 'general_financial_question';
  confidence: number;
  entities: {
    amount?: number;
    currency?: Currency;
    recipient?: string;
    paymentMethod?: string;
    source?: string;
    destination?: string;
  };
  missingInformation: string[];
  requiresConfirmation: boolean;
  actionType: 'financial_action' | 'informational';
}

export interface AIMessage {
  id: string;
  userId?: string;
  sender: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: {
    agentUsed?: 'NLP' | 'FINANCIAL_INTELLIGENCE' | 'FINANCIAL_ASSISTANT';
    model?: string;
    tokensUsed?: number;
    estimatedCostUsd?: number;
    actionDraft?: {
      type: 'TRANSFER' | 'EXCHANGE' | 'PAYPAL_PAYMENT';
      amount: number;
      currency: Currency;
      recipient?: string;
      destination?: string;
      fee: number;
      total: number;
      draftId: string;
    };
    richCard?: {
      type: 'TRANSACTION_PREVIEW' | 'EXCHANGE_QUOTE' | 'ANOMALY_ALERT' | 'STATUS_CARD';
      data: any;
    };
  };
}

export interface SecurityScenarioResult {
  id: number;
  title: string;
  category: string;
  status: 'PASSED' | 'FAILED' | 'RUNNING';
  durationMs: number;
  details: string;
  invariantChecked: string;
}
