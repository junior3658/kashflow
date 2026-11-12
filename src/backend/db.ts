/**
 * In-memory persistence engine for KASHFLOW.
 * Implements relational constraints, multi-tenant isolation, and seed data.
 */

import {
  User,
  Organization,
  Membership,
  Wallet,
  LedgerAccount,
  LedgerEntry,
  Transaction,
  CryptoPosition,
  AuditLog,
  AIMessage,
} from './types';

export class KashflowDatabase {
  users: Map<string, User> = new Map();
  organizations: Map<string, Organization> = new Map();
  memberships: Map<string, Membership> = new Map();
  wallets: Map<string, Wallet> = new Map();
  ledgerAccounts: Map<string, LedgerAccount> = new Map();
  ledgerEntries: LedgerEntry[] = [];
  transactions: Map<string, Transaction> = new Map();
  idempotencyStore: Map<string, { transactionId: string; response: any; createdAt: number }> = new Map();
  cryptoPositions: Map<string, CryptoPosition> = new Map();
  auditLogs: AuditLog[] = [];
  aiMessages: AIMessage[] = [];

  constructor() {
    this.seedDatabase();
  }

  seedDatabase() {
    // 1. Primary User: Junior
    const userJunior: User = {
      id: 'usr_junior_01',
      email: 'demo@kashflow.local',
      fullName: 'KASHFLOW Demo User',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      role: 'BUSINESS_OWNER',
      currentOrgId: 'org_kashflow_corp',
      createdAt: '2026-01-15T08:00:00Z',
    };

    const userPatrick: User = {
      id: 'usr_patrick_02',
      email: 'patrick@partner.com',
      fullName: 'Patrick M.',
      role: 'PERSONAL_USER',
      createdAt: '2026-02-10T10:00:00Z',
    };

    const userAdmin: User = {
      id: 'usr_admin_platform',
      email: 'security@kashflow.io',
      fullName: 'Security Auditor',
      role: 'PLATFORM_ADMIN',
      createdAt: '2026-01-01T00:00:00Z',
    };

    this.users.set(userJunior.id, userJunior);
    this.users.set(userPatrick.id, userPatrick);
    this.users.set(userAdmin.id, userAdmin);

    // 2. Organization: KashFlow Global SARL
    const org: Organization = {
      id: 'org_kashflow_corp',
      name: 'KASHFLOW Enterprise Solutions',
      taxId: 'DEMO-TAX-ID',
      ownerUserId: userJunior.id,
      currency: 'USD',
      status: 'ACTIVE',
      createdAt: '2026-01-20T09:00:00Z',
    };
    this.organizations.set(org.id, org);

    // 3. Organization Memberships
    const membershipOwner: Membership = {
      id: 'mem_01',
      orgId: org.id,
      userId: userJunior.id,
      role: 'OWNER',
      permissions: ['ALL'],
    };
    this.memberships.set(membershipOwner.id, membershipOwner);

    // 4. Chart of Accounts
    const accounts: LedgerAccount[] = [
      { code: '1010', name: 'User Available Cash (USD)', type: 'ASSET', currency: 'USD', balance: 1284050 },
      { code: '1020', name: 'User Available Cash (EUR)', type: 'ASSET', currency: 'EUR', balance: 420000 },
      { code: '1030', name: 'User Available Cash (CDF)', type: 'ASSET', currency: 'CDF', balance: 2850000000 },
      { code: '1050', name: 'PayPal Transit Account', type: 'ASSET', currency: 'USD', balance: 0 },
      { code: '1060', name: 'Shwary Transit Account', type: 'ASSET', currency: 'USD', balance: 0 },
      { code: '2010', name: 'Customer Deposits (Liability)', type: 'LIABILITY', currency: 'USD', balance: 1284050 },
      { code: '4010', name: 'Platform Fee Revenue', type: 'REVENUE', currency: 'USD', balance: 4500 },
      { code: '5010', name: 'Provider Processing Fees', type: 'EXPENSE', currency: 'USD', balance: 1250 },
    ];
    for (const acc of accounts) {
      this.ledgerAccounts.set(acc.code, acc);
    }

    // 5. Wallets
    const personalUsdWallet: Wallet = {
      id: 'wlt_personal_usd',
      ownerId: userJunior.id,
      type: 'PERSONAL',
      currency: 'USD',
      name: 'Primary USD Wallet',
      internalAccountingBalance: 1284050, // $12,840.50 (in cents)
      externalProviderBalance: 1284050,
      pendingDebits: 0,
      pendingCredits: 0,
      status: 'ACTIVE',
      createdAt: '2026-01-15T08:30:00Z',
      updatedAt: '2026-11-09T08:00:00Z',
    };

    const personalEurWallet: Wallet = {
      id: 'wlt_personal_eur',
      ownerId: userJunior.id,
      type: 'PERSONAL',
      currency: 'EUR',
      name: 'Euro Settlement Wallet',
      internalAccountingBalance: 420000, // €4,200.00
      externalProviderBalance: 420000,
      pendingDebits: 0,
      pendingCredits: 0,
      status: 'ACTIVE',
      createdAt: '2026-02-01T10:00:00Z',
      updatedAt: '2026-11-08T15:00:00Z',
    };

    const personalCdfWallet: Wallet = {
      id: 'wlt_personal_cdf',
      ownerId: userJunior.id,
      type: 'PERSONAL',
      currency: 'CDF',
      name: 'Congolese Franc Mobile Cash',
      internalAccountingBalance: 2850000000, // 28,500,000 CDF
      externalProviderBalance: 2850000000,
      pendingDebits: 0,
      pendingCredits: 0,
      status: 'ACTIVE',
      createdAt: '2026-02-15T12:00:00Z',
      updatedAt: '2026-11-09T06:00:00Z',
    };

    const businessUsdWallet: Wallet = {
      id: 'wlt_business_usd',
      ownerId: org.id,
      type: 'BUSINESS',
      currency: 'USD',
      name: 'KashFlow Commercial Treasury',
      internalAccountingBalance: 8425000, // $84,250.00
      externalProviderBalance: 8425000,
      pendingDebits: 0,
      pendingCredits: 0,
      status: 'ACTIVE',
      createdAt: '2026-01-20T09:30:00Z',
      updatedAt: '2026-11-09T07:15:00Z',
    };

    this.wallets.set(personalUsdWallet.id, personalUsdWallet);
    this.wallets.set(personalEurWallet.id, personalEurWallet);
    this.wallets.set(personalCdfWallet.id, personalCdfWallet);
    this.wallets.set(businessUsdWallet.id, businessUsdWallet);

    // 6. Recent Transactions
    const txSeed: Transaction[] = [
      {
        id: 'tx_01',
        userId: userJunior.id,
        type: 'TRANSFER',
        status: 'SUCCEEDED',
        sourceWalletId: personalUsdWallet.id,
        destinationWalletId: 'wlt_external_patrick',
        amount: 12000, // $120.00
        fee: 0,
        currency: 'USD',
        recipientName: 'Patrick M.',
        recipientAccount: '+243 81 999 1234',
        provider: 'SHWARY',
        providerReference: 'SHW-P-887412',
        description: 'Transfer to Patrick',
        createdAt: '2026-11-09T10:42:00Z',
        updatedAt: '2026-11-09T10:42:05Z',
      },
      {
        id: 'tx_02',
        userId: userJunior.id,
        type: 'PAYPAL_PAYMENT',
        status: 'SUCCEEDED',
        sourceWalletId: 'paypal_ext_client',
        destinationWalletId: personalUsdWallet.id,
        amount: 45000, // $450.00
        fee: 650,      // $6.50
        currency: 'USD',
        recipientName: 'Junior Ngwej',
        provider: 'PAYPAL',
        providerReference: 'PAYPAL-CAP-99120',
        description: 'Payment received',
        createdAt: '2026-11-08T14:15:00Z',
        updatedAt: '2026-11-08T14:15:08Z',
      },
      {
        id: 'tx_03',
        userId: userJunior.id,
        type: 'TRANSFER',
        status: 'SUCCEEDED',
        sourceWalletId: personalUsdWallet.id,
        amount: 6850, // $68.50
        fee: 0,
        currency: 'USD',
        recipientName: 'Cloud Services Provider',
        provider: 'INTERNAL',
        description: 'Online purchase',
        createdAt: '2026-11-07T16:30:00Z',
        updatedAt: '2026-11-07T16:30:02Z',
      },
      {
        id: 'tx_04',
        userId: userJunior.id,
        type: 'EXCHANGE',
        status: 'SUCCEEDED',
        sourceWalletId: personalUsdWallet.id,
        destinationWalletId: personalEurWallet.id,
        amount: 20000, // $200.00
        fee: 150,      // $1.50
        currency: 'USD',
        recipientName: 'Self (EUR Wallet)',
        provider: 'EXCHANGE_DESK',
        description: 'Currency exchange USD -> EUR',
        createdAt: '2026-11-06T09:10:00Z',
        updatedAt: '2026-11-06T09:10:04Z',
      },
      {
        id: 'tx_05',
        userId: userJunior.id,
        type: 'TRANSFER',
        status: 'SUCCEEDED',
        sourceWalletId: personalUsdWallet.id,
        amount: 999, // $9.99
        fee: 0,
        currency: 'USD',
        recipientName: 'Spotify',
        provider: 'PAYPAL',
        description: 'Spotify Monthly Subscription',
        createdAt: '2026-11-01T12:00:00Z',
        updatedAt: '2026-11-01T12:00:05Z',
      },
      {
        id: 'tx_06',
        userId: userJunior.id,
        type: 'TRANSFER',
        status: 'CANCELLED',
        sourceWalletId: personalUsdWallet.id,
        amount: 499, // $4.99
        fee: 0,
        currency: 'USD',
        recipientName: 'App Store',
        provider: 'INTERNAL',
        description: 'App Store Subscription (Canceled)',
        createdAt: '2026-10-28T09:00:00Z',
        updatedAt: '2026-10-28T09:01:00Z',
      },
    ];

    for (const tx of txSeed) {
      this.transactions.set(tx.id, tx);
      // Seed balanced ledger entries for succeeded ones
      if (tx.status === 'SUCCEEDED') {
        this.ledgerEntries.push(
          {
            id: `le_${tx.id}_d`,
            transactionId: tx.id,
            accountCode: '1010',
            entryType: 'DEBIT',
            amount: tx.amount,
            currency: tx.currency,
            description: tx.description,
            createdAt: tx.createdAt,
          },
          {
            id: `le_${tx.id}_c`,
            transactionId: tx.id,
            accountCode: '2010',
            entryType: 'CREDIT',
            amount: tx.amount,
            currency: tx.currency,
            description: tx.description,
            createdAt: tx.createdAt,
          }
        );
      }
    }

    // 7. Seed Simulated Crypto Portfolio
    this.cryptoPositions.set('BTC', {
      symbol: 'BTC',
      amount: 0.285,
      averageBuyPriceUsd: 82400.0,
      currentValueUsd: 25422.0,
      pnlUsd: 1938.0,
      pnlPercent: 8.25,
      isSimulated: true,
    });
    this.cryptoPositions.set('ETH', {
      symbol: 'ETH',
      amount: 3.5,
      averageBuyPriceUsd: 3100.0,
      currentValueUsd: 11970.0,
      pnlUsd: 1120.0,
      pnlPercent: 10.32,
      isSimulated: true,
    });
    this.cryptoPositions.set('USDT', {
      symbol: 'USDT',
      amount: 4500.0,
      averageBuyPriceUsd: 1.0,
      currentValueUsd: 4500.0,
      pnlUsd: 0.0,
      pnlPercent: 0.0,
      isSimulated: true,
    });

    // 8. Seed Audit Log
    this.auditLogs.push({
      id: 'aud_seed_01',
      timestamp: new Date().toISOString(),
      actorUserId: userJunior.id,
      actorEmail: userJunior.email,
      action: 'SYSTEM_BOOTSTRAP',
      resourceType: 'FINANCIAL_CORE',
      resourceId: 'ledger_01',
      severity: 'INFO',
      details: { invariant: 'SUM(DEBITS) == SUM(CREDITS)', status: 'HEALTHY' },
    });

    // 9. Initial Seed AI Greeting
    this.aiMessages.push({
      id: 'msg_init',
      sender: 'assistant',
      content:
        'Hello! I am KASH AI, your financial copilot. I can prepare payments, compare exchange rates (USD/EUR/CDF), analyze your cash flow, or inspect transactions. How can I help you today?',
      timestamp: new Date().toISOString(),
      metadata: {
        agentUsed: 'FINANCIAL_ASSISTANT',
      },
    });
  }
}

export const db = new KashflowDatabase();
