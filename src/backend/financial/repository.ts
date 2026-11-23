import { openFinancialDatabase, FinancialDatabase } from './schema';

export type FinancialCurrency = 'USD' | 'EUR' | 'CDF';

export class FinancialRepository {
  constructor(private readonly sql: FinancialDatabase) {}

  /**
   * Idempotently provision zero-balance personal wallets for a verified auth user.
   * This is identity/provisioning only: no demo balances or opening entries are imported.
   */
  provisionPersonalWallets(userId: string, createdAt: string): string[] {
    if (typeof userId !== 'string' || userId.trim() !== userId || userId.length < 1 || userId.length > 128) {
      throw new Error('A valid financial wallet owner ID is required.');
    }
    if (typeof createdAt !== 'string' || !Number.isFinite(Date.parse(createdAt))) {
      throw new Error('A valid wallet creation timestamp is required.');
    }

    const currencies: FinancialCurrency[] = ['USD', 'EUR', 'CDF'];
    const walletIds = currencies.map((currency) => `wlt_${userId}_${currency.toLowerCase()}`);

    this.sql.exec('BEGIN IMMEDIATE');
    try {
      for (const currency of currencies) {
        const walletId = `wlt_${userId}_${currency.toLowerCase()}`;
        const name = `Primary ${currency} Wallet`;

        this.sql.prepare(`
          INSERT OR IGNORE INTO wallets (
            id, owner_type, owner_id, wallet_type, currency, name,
            internal_balance_minor, provider_balance_status,
            pending_debits_minor, pending_credits_minor, is_simulated,
            status, created_at, updated_at
          ) VALUES (?, 'USER', ?, 'PERSONAL', ?, ?, 0, 'NOT_SYNCED', 0, 0, 0, 'ACTIVE', ?, ?)
        `).run(walletId, userId, currency, name, createdAt, createdAt);

        const wallet = this.sql.prepare(
          'SELECT owner_type, owner_id, wallet_type, currency, internal_balance_minor FROM wallets WHERE id = ?'
        ).get(walletId) as {
          owner_type: string; owner_id: string; wallet_type: string;
          currency: string; internal_balance_minor: number;
        } | undefined;

        if (!wallet || wallet.owner_type !== 'USER' || wallet.owner_id !== userId ||
            wallet.wallet_type !== 'PERSONAL' || wallet.currency !== currency) {
          throw new Error('Existing financial wallet identity does not match the authenticated owner.');
        }

        const account = this.sql.prepare(
          'SELECT id, account_type, currency, wallet_id, balance_minor FROM ledger_accounts WHERE wallet_id = ? AND currency = ?'
        ).get(walletId, currency) as {
          id: string; account_type: string; currency: string; wallet_id: string; balance_minor: number;
        } | undefined;

        if (!account) {
          // Do not fabricate an opening ledger entry or adopt an existing non-zero projection.
          if (wallet.internal_balance_minor !== 0) {
            throw new Error('A non-zero wallet without its linked ledger account requires an explicit reconciliation.');
          }
          this.sql.prepare(`
            INSERT INTO ledger_accounts (id, code, name, account_type, currency, wallet_id, balance_minor, created_at)
            VALUES (?, ?, ?, 'LIABILITY', ?, ?, 0, ?)
          `).run(`la_${walletId}`, `WALLET_${walletId}`, `Wallet liability ${currency}`, currency, walletId, createdAt);
        } else if (account.account_type !== 'LIABILITY' || account.currency !== currency ||
                   account.wallet_id !== walletId || account.balance_minor !== wallet.internal_balance_minor) {
          throw new Error('Existing wallet and ledger-account projections do not match.');
        }
      }

      this.sql.exec('COMMIT');
      return walletIds;
    } catch (error) {
      try { this.sql.exec('ROLLBACK'); } catch { /* transaction may already have ended */ }
      throw error;
    }
  }

  /**
   * Provision the authenticated owner of a self-registered business account.
   * The organization, active owner membership, business wallet and liability
   * account are created together; existing revoked/suspended identities fail closed.
   */
  provisionBusinessWallet(userId: string, organizationId: string, businessName: string, createdAt: string): string {
    if (typeof userId !== 'string' || userId.trim() !== userId || userId.length < 1 || userId.length > 128) {
      throw new Error('A valid business-wallet owner ID is required.');
    }
    if (organizationId !== `org_${userId}`) {
      throw new Error('A business account can only provision its own deterministic organization ID.');
    }
    const normalizedName = typeof businessName === 'string' ? businessName.trim() : '';
    if (normalizedName.length < 2 || normalizedName.length > 120) {
      throw new Error('A valid business name is required.');
    }
    if (typeof createdAt !== 'string' || !Number.isFinite(Date.parse(createdAt))) {
      throw new Error('A valid business-wallet creation timestamp is required.');
    }

    const walletId = `wlt_${organizationId}_usd`;
    this.sql.exec('BEGIN IMMEDIATE');
    try {
      this.sql.prepare(`
        INSERT OR IGNORE INTO financial_organizations (id, status, created_at)
        VALUES (?, 'ACTIVE', ?)
      `).run(organizationId, createdAt);

      const organization = this.sql.prepare(
        'SELECT status FROM financial_organizations WHERE id = ?'
      ).get(organizationId) as { status: string } | undefined;
      if (!organization || organization.status !== 'ACTIVE') {
        throw new Error('The business organization is not active.');
      }

      this.sql.prepare(`
        INSERT OR IGNORE INTO organization_memberships (
          organization_id, user_id, role, status, can_transact, created_at
        ) VALUES (?, ?, 'OWNER', 'ACTIVE', 1, ?)
      `).run(organizationId, userId, createdAt);

      const membership = this.sql.prepare(`
        SELECT role, status, can_transact FROM organization_memberships
        WHERE organization_id = ? AND user_id = ?
      `).get(organizationId, userId) as { role: string; status: string; can_transact: number } | undefined;
      if (!membership || membership.role !== 'OWNER' || membership.status !== 'ACTIVE' || membership.can_transact !== 1) {
        throw new Error('Existing business-owner membership is revoked or does not match the authenticated account.');
      }

      this.sql.prepare(`
        INSERT OR IGNORE INTO wallets (
          id, owner_type, owner_id, wallet_type, currency, name,
          internal_balance_minor, provider_balance_status,
          pending_debits_minor, pending_credits_minor, is_simulated,
          status, created_at, updated_at
        ) VALUES (?, 'ORGANIZATION', ?, 'BUSINESS', 'USD', ?, 0, 'NOT_SYNCED', 0, 0, 0, 'ACTIVE', ?, ?)
      `).run(walletId, organizationId, `${normalizedName} Treasury`, createdAt, createdAt);

      const wallet = this.sql.prepare(`
        SELECT owner_type, owner_id, wallet_type, currency, internal_balance_minor
        FROM wallets WHERE id = ?
      `).get(walletId) as {
        owner_type: string; owner_id: string; wallet_type: string;
        currency: string; internal_balance_minor: number;
      } | undefined;
      if (!wallet || wallet.owner_type !== 'ORGANIZATION' || wallet.owner_id !== organizationId ||
          wallet.wallet_type !== 'BUSINESS' || wallet.currency !== 'USD') {
        throw new Error('Existing business wallet identity does not match the authenticated organization.');
      }

      const account = this.sql.prepare(`
        SELECT id, account_type, currency, wallet_id, balance_minor
        FROM ledger_accounts WHERE wallet_id = ? AND currency = 'USD'
      `).get(walletId) as {
        id: string; account_type: string; currency: string; wallet_id: string; balance_minor: number;
      } | undefined;
      if (!account) {
        if (wallet.internal_balance_minor !== 0) {
          throw new Error('A non-zero business wallet without its linked ledger account requires explicit reconciliation.');
        }
        this.sql.prepare(`
          INSERT INTO ledger_accounts (id, code, name, account_type, currency, wallet_id, balance_minor, created_at)
          VALUES (?, ?, ?, 'LIABILITY', 'USD', ?, 0, ?)
        `).run(`la_${walletId}`, `WALLET_${walletId}`, 'Business wallet liability USD', walletId, createdAt);
      } else if (account.account_type !== 'LIABILITY' || account.currency !== 'USD' ||
                 account.wallet_id !== walletId || account.balance_minor !== wallet.internal_balance_minor) {
        throw new Error('Existing business wallet and ledger-account projections do not match.');
      }

      this.sql.exec('COMMIT');
      return walletId;
    } catch (error) {
      try { this.sql.exec('ROLLBACK'); } catch { /* transaction may already have ended */ }
      throw error;
    }
  }
}

let defaultRepository: FinancialRepository | undefined;

/** Lazily open the persistent repository so tests can isolate database paths. */
export function getFinancialRepository(): FinancialRepository {
  if (!defaultRepository) defaultRepository = new FinancialRepository(openFinancialDatabase());
  return defaultRepository;
}
