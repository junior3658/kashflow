import { createHash, randomUUID } from 'node:crypto';
import { openFinancialDatabase, FinancialDatabase } from './schema';
import type { Wallet, WalletType, Currency, Transaction, TransactionStatus, TransactionType } from '../types';

export type FinancialCurrency = 'USD' | 'EUR' | 'CDF';

export interface PersistentInternalTransferDraftInput {
  userId: string;
  orgId?: string;
  sourceWalletId: string;
  destinationWalletId: string;
  amountMinor: number;
  currency: Currency;
  description: string;
  idempotencyKey: string;
  metadata?: Record<string, unknown>;
}

type FinancialTransactionRow = {
  id: string;
  user_id: string;
  org_id: string | null;
  transaction_type: string;
  status: string;
  source_wallet_id: string;
  destination_wallet_id: string | null;
  amount_minor: number;
  fee_minor: number;
  currency: string;
  provider: string;
  provider_reference: string | null;
  description: string;
  metadata_json: string | null;
  failure_reason: string | null;
  created_at: string;
  updated_at: string;
  idempotency_key?: string | null;
};

type FinancialWalletRow = {
  id: string;
  owner_type: string;
  owner_id: string;
  wallet_type: string;
  currency: string;
  name: string;
  internal_balance_minor: number;
  provider_balance_minor: number | null;
  provider_balance_status: string;
  pending_debits_minor: number;
  pending_credits_minor: number;
  is_simulated: number;
  status: string;
  created_at: string;
  updated_at: string;
};

function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return '[' + value.map(stableSerialize).join(',') + ']';
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).filter((key) => record[key] !== undefined).sort();
  return '{' + keys.map((key) => JSON.stringify(key) + ':' + stableSerialize(record[key])).join(',') + '}';
}

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
  /** Read wallet projections from SQLite with requester-scoped ownership checks. */
  getWalletsByOwner(
    ownerType: 'USER' | 'ORGANIZATION',
    ownerId: string,
    requesterUserId: string,
    walletType?: WalletType,
  ): Wallet[] {
    if (!ownerId || !requesterUserId) throw new Error('Wallet owner and authenticated requester are required.');
    if (ownerType === 'USER' && ownerId !== requesterUserId) {
      throw new Error('Personal wallet reads are restricted to the authenticated owner.');
    }
    if (ownerType === 'ORGANIZATION' && !this.hasActiveMembership(requesterUserId, ownerId)) {
      throw new Error('Persistent active organization membership is required to read business wallets.');
    }
    if (walletType && !(['PERSONAL', 'BUSINESS', 'ESCROW', 'SETTLEMENT'] as string[]).includes(walletType)) {
      throw new Error('Unsupported wallet type.');
    }

    const base = `
      SELECT id, owner_id, wallet_type, currency, name,
             internal_balance_minor, provider_balance_minor, provider_balance_status,
             pending_debits_minor, pending_credits_minor, is_simulated,
             status, created_at, updated_at
      FROM wallets WHERE owner_type = ? AND owner_id = ?
    `;
    const rows = (walletType
      ? this.sql.prepare(base + ' AND wallet_type = ? ORDER BY currency, id').all(ownerType, ownerId, walletType)
      : this.sql.prepare(base + ' ORDER BY currency, id').all(ownerType, ownerId)) as Array<{
        id: string; owner_id: string; wallet_type: string; currency: string; name: string;
        internal_balance_minor: number; provider_balance_minor: number | null;
        provider_balance_status: string; pending_debits_minor: number; pending_credits_minor: number;
        is_simulated: number; status: string; created_at: string; updated_at: string;
      }>;

    return rows.map((row) => ({
      id: row.id,
      ownerId: row.owner_id,
      type: row.wallet_type as WalletType,
      currency: row.currency as Currency,
      name: row.name,
      internalAccountingBalance: row.internal_balance_minor,
      // Zero is only a legacy UI sentinel; status remains NOT_SYNCED/STALE and
      // must be checked before any provider amount is displayed as authoritative.
      externalProviderBalance: row.provider_balance_minor ?? 0,
      externalProviderBalanceStatus: row.provider_balance_status as Wallet['externalProviderBalanceStatus'],
      pendingDebits: row.pending_debits_minor,
      pendingCredits: row.pending_credits_minor,
      isSimulated: row.is_simulated === 1,
      status: row.status as Wallet['status'],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  /** Read access requires a persistent active membership and active organization. */
  hasActiveMembership(userId: string, organizationId: string): boolean {
    if (!userId || !organizationId) return false;
    const result = this.sql.prepare(`
      SELECT EXISTS (
        SELECT 1 FROM organization_memberships m
        JOIN financial_organizations o ON o.id = m.organization_id
        WHERE m.organization_id = ? AND m.user_id = ?
          AND m.status = 'ACTIVE' AND o.status = 'ACTIVE'
      ) AS authorized
    `).get(organizationId, userId) as { authorized: number } | undefined;
    return result?.authorized === 1;
  }

  /** Transaction access additionally requires the explicit can_transact flag. */
  hasActiveTransactionMembership(userId: string, organizationId: string): boolean {
    if (!userId || !organizationId) return false;
    const result = this.sql.prepare(`
      SELECT EXISTS (
        SELECT 1 FROM organization_memberships m
        JOIN financial_organizations o ON o.id = m.organization_id
        WHERE m.organization_id = ? AND m.user_id = ?
          AND m.status = 'ACTIVE' AND m.can_transact = 1
          AND o.status = 'ACTIVE'
      ) AS authorized
    `).get(organizationId, userId) as { authorized: number } | undefined;
    return result?.authorized === 1;
  }


  private readTransactionRow(transactionId: string): FinancialTransactionRow | undefined {
    return this.sql.prepare(
      'SELECT t.*, k.idempotency_key FROM transactions t LEFT JOIN idempotency_keys k ON k.transaction_id = t.id WHERE t.id = ?'
    ).get(transactionId) as FinancialTransactionRow | undefined;
  }

  private mapTransaction(row: FinancialTransactionRow): Transaction {
    let metadata: Record<string, any> | undefined;
    if (row.metadata_json) {
      const parsed: unknown = JSON.parse(row.metadata_json);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('Stored transaction metadata is invalid.');
      }
      metadata = parsed as Record<string, any>;
    }
    return {
      id: row.id,
      idempotencyKey: row.idempotency_key ?? undefined,
      userId: row.user_id,
      orgId: row.org_id ?? undefined,
      type: row.transaction_type as TransactionType,
      status: row.status as TransactionStatus,
      sourceWalletId: row.source_wallet_id,
      destinationWalletId: row.destination_wallet_id ?? undefined,
      amount: row.amount_minor,
      fee: row.fee_minor,
      currency: row.currency as Currency,
      recipientName: typeof metadata?.recipientName === 'string' ? metadata.recipientName : undefined,
      recipientAccount: typeof metadata?.recipientAccount === 'string' ? metadata.recipientAccount : undefined,
      provider: row.provider as Transaction['provider'],
      providerReference: row.provider_reference ?? undefined,
      description: row.description,
      metadata,
      failureReason: row.failure_reason ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapWallet(row: FinancialWalletRow): Wallet {
    return {
      id: row.id,
      ownerId: row.owner_id,
      type: row.wallet_type as WalletType,
      currency: row.currency as Currency,
      name: row.name,
      internalAccountingBalance: row.internal_balance_minor,
      externalProviderBalance: row.provider_balance_minor ?? 0,
      externalProviderBalanceStatus: row.provider_balance_status as Wallet['externalProviderBalanceStatus'],
      pendingDebits: row.pending_debits_minor,
      pendingCredits: row.pending_credits_minor,
      isSimulated: row.is_simulated === 1,
      status: row.status as Wallet['status'],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  hasWallet(walletId: string): boolean {
    return Boolean(this.sql.prepare('SELECT 1 AS present FROM wallets WHERE id = ?').get(walletId));
  }

  hasTransaction(transactionId: string): boolean {
    return Boolean(this.sql.prepare('SELECT 1 AS present FROM transactions WHERE id = ?').get(transactionId));
  }

  /** Return a transaction only to the user who created it. */
  getTransactionForUser(transactionId: string, userId: string): Transaction | null {
    const row = this.readTransactionRow(transactionId);
    if (!row || row.user_id !== userId) return null;
    return this.mapTransaction(row);
  }

  /** Persistent transaction history is scoped to its authenticated creator. */
  getTransactionsByUser(userId: string): Transaction[] {
    const rows = this.sql.prepare(
      'SELECT t.*, k.idempotency_key FROM transactions t LEFT JOIN idempotency_keys k ON k.transaction_id = t.id WHERE t.user_id = ? ORDER BY t.created_at DESC, t.id DESC'
    ).all(userId) as FinancialTransactionRow[];
    return rows.map((row) => this.mapTransaction(row));
  }

  /**
   * Resolve a transaction wallet without consulting the runtime Maps.
   * A personal wallet must belong to the requester; an organization wallet
   * additionally requires an active persistent membership with transaction permission.
   */
  getWalletForTransaction(walletId: string, requesterUserId: string, organizationId?: string): Wallet | null {
    const row = this.sql.prepare(
      'SELECT id, owner_type, owner_id, wallet_type, currency, name, internal_balance_minor, provider_balance_minor, provider_balance_status, pending_debits_minor, pending_credits_minor, is_simulated, status, created_at, updated_at FROM wallets WHERE id = ?'
    ).get(walletId) as FinancialWalletRow | undefined;
    if (!row) return null;
    if (row.status !== 'ACTIVE') throw new Error('Wallet is not active.');
    if (row.owner_type === 'USER') {
      if (row.owner_id !== requesterUserId) throw new Error('Wallet is outside the authenticated user scope.');
    } else if (row.owner_type === 'ORGANIZATION') {
      if (!organizationId || row.owner_id !== organizationId ||
          !this.hasActiveTransactionMembership(requesterUserId, organizationId)) {
        throw new Error('Active persistent organization transaction membership is required.');
      }
    } else {
      throw new Error('Unsupported wallet owner type.');
    }
    return this.mapWallet(row);
  }

  /**
   * Persist an internal wallet-to-wallet draft and its idempotency key atomically.
   * This method never creates provider transactions or credits a wallet.
   */
  createInternalTransferDraft(input: PersistentInternalTransferDraftInput): Transaction {
    if (!input.userId || input.userId.trim() !== input.userId || input.userId.length > 128) {
      throw new Error('A valid authenticated transaction owner is required.');
    }
    if (!input.sourceWalletId || !input.destinationWalletId ||
        input.sourceWalletId === input.destinationWalletId) {
      throw new Error('Two distinct persistent wallets are required for an internal transfer.');
    }
    if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) {
      throw new Error('Transaction amount must be a positive safe integer in minor units.');
    }
    if (!['USD', 'EUR', 'CDF'].includes(input.currency)) throw new Error('Unsupported transaction currency.');
    if (typeof input.description !== 'string' || input.description.trim() !== input.description ||
        input.description.length < 1 || input.description.length > 500) {
      throw new Error('A valid transaction description is required.');
    }
    if (typeof input.idempotencyKey !== 'string' ||
        input.idempotencyKey.length < 1 || input.idempotencyKey.length > 128 ||
        input.idempotencyKey.trim() !== input.idempotencyKey) {
      throw new Error('Persistent internal transfers require an idempotency key of 1–128 characters without surrounding whitespace.');
    }

    const metadataJson = input.metadata ? stableSerialize(input.metadata) : null;
    if (metadataJson && metadataJson.length > 10000) throw new Error('Transaction metadata is too large.');
    const requestHash = createHash('sha256').update(stableSerialize({
      userId: input.userId,
      orgId: input.orgId ?? null,
      type: 'TRANSFER',
      sourceWalletId: input.sourceWalletId,
      destinationWalletId: input.destinationWalletId,
      amountMinor: input.amountMinor,
      feeMinor: 0,
      currency: input.currency,
      provider: 'INTERNAL',
      description: input.description,
      metadata: input.metadata ?? null,
    })).digest('hex');

    this.sql.exec('BEGIN IMMEDIATE');
    try {
      {
        const existing = this.sql.prepare(
          'SELECT t.*, k.idempotency_key, k.request_sha256 FROM idempotency_keys k JOIN transactions t ON t.id = k.transaction_id WHERE k.user_id = ? AND k.idempotency_key = ?'
        ).get(input.userId, input.idempotencyKey) as (FinancialTransactionRow & { request_sha256: string }) | undefined;
        if (existing) {
          if (existing.request_sha256 !== requestHash) {
            throw new Error('Idempotency key has already been used with a different transaction payload.');
          }
          this.sql.exec('COMMIT');
          return this.mapTransaction(existing);
        }
      }

      const transactionId = 'tx_' + randomUUID();
      const now = new Date().toISOString();
      this.sql.prepare(
        "INSERT INTO transactions (id, user_id, org_id, transaction_type, status, source_wallet_id, destination_wallet_id, amount_minor, fee_minor, currency, provider, description, metadata_json, created_at, updated_at) VALUES (?, ?, ?, 'TRANSFER', 'CREATED', ?, ?, ?, 0, ?, 'INTERNAL', ?, ?, ?, ?)"
      ).run(
        transactionId, input.userId, input.orgId ?? null,
        input.sourceWalletId, input.destinationWalletId, input.amountMinor,
        input.currency, input.description, metadataJson, now, now,
      );

      {
        this.sql.prepare(
          'INSERT INTO idempotency_keys (user_id, idempotency_key, request_sha256, transaction_id, created_at) VALUES (?, ?, ?, ?, ?)'
        ).run(input.userId, input.idempotencyKey, requestHash, transactionId, now);
      }

      this.sql.exec('COMMIT');
      const created = this.readTransactionRow(transactionId);
      if (!created) throw new Error('Persisted transaction could not be reloaded.');
      return this.mapTransaction(created);
    } catch (error) {
      try { this.sql.exec('ROLLBACK'); } catch { /* transaction may already have ended */ }
      throw error;
    }
  }

  /** Atomically transition CREATED to PENDING and reserve the exact source total. */
  markInternalTransactionPending(transactionId: string, requesterUserId: string): Transaction {
    this.sql.exec('BEGIN IMMEDIATE');
    try {
      const row = this.readTransactionRow(transactionId);
      if (!row || row.user_id !== requesterUserId) throw new Error('Transaction not found for authenticated user.');
      if (row.provider !== 'INTERNAL' || row.transaction_type !== 'TRANSFER' || !row.destination_wallet_id) {
        throw new Error('Only persistent internal wallet transfers can be reserved by this operation.');
      }
      if (row.status !== 'CREATED') throw new Error('Only CREATED transactions can become PENDING.');
      const total = row.amount_minor + row.fee_minor;
      if (!Number.isSafeInteger(total) || total <= 0) throw new Error('Reservation total is outside the safe integer range.');

      const now = new Date().toISOString();
      const changed = this.sql.prepare(
        "UPDATE transactions SET status = 'PENDING', updated_at = ? WHERE id = ? AND user_id = ? AND status = 'CREATED'"
      ).run(now, transactionId, requesterUserId);
      if (changed.changes !== 1) throw new Error('Transaction state changed before reservation.');

      this.sql.prepare(
        "INSERT INTO wallet_reservations (transaction_id, wallet_id, currency, amount_minor, status, created_at, updated_at) VALUES (?, ?, ?, ?, 'ACTIVE', ?, ?)"
      ).run(transactionId, row.source_wallet_id, row.currency, total, now, now);

      this.sql.exec('COMMIT');
      const pending = this.readTransactionRow(transactionId);
      if (!pending) throw new Error('Pending transaction could not be reloaded.');
      return this.mapTransaction(pending);
    } catch (error) {
      try { this.sql.exec('ROLLBACK'); } catch { /* transaction may already have ended */ }
      throw error;
    }
  }

  /**
   * Post a zero-fee internal transfer atomically. The SQL triggers update both
   * wallet and liability-account projections and consume the reservation.
   */
  executeInternalTransfer(transactionId: string, requesterUserId: string): Transaction {
    this.sql.exec('BEGIN IMMEDIATE');
    try {
      const row = this.readTransactionRow(transactionId);
      if (!row || row.user_id !== requesterUserId) throw new Error('Transaction not found for authenticated user.');
      if (row.status === 'SUCCEEDED') {
        const postedBatch = this.sql.prepare(
          "SELECT 1 AS present FROM ledger_batches WHERE transaction_id = ? AND batch_type = 'POSTING' AND posted_at IS NOT NULL"
        ).get(transactionId);
        if (!postedBatch) throw new Error('Succeeded transaction is missing its posted ledger batch.');
        this.sql.exec('COMMIT');
        return this.mapTransaction(row);
      }
      if (row.status !== 'PENDING') throw new Error('Execution requires a PENDING transaction.');
      if (row.provider !== 'INTERNAL' || row.transaction_type !== 'TRANSFER' ||
          !row.destination_wallet_id || row.fee_minor !== 0) {
        throw new Error('Only zero-fee persistent internal wallet transfers can be settled here.');
      }

      const amount = row.amount_minor;
      const now = new Date().toISOString();
      const changed = this.sql.prepare(
        "UPDATE transactions SET status = 'PROCESSING', updated_at = ? WHERE id = ? AND user_id = ? AND status = 'PENDING'"
      ).run(now, transactionId, requesterUserId);
      if (changed.changes !== 1) throw new Error('Transaction state changed before processing.');

      const accountForWallet = (walletId: string) => this.sql.prepare(
        'SELECT a.id, a.account_type, a.balance_minor, w.internal_balance_minor, w.pending_debits_minor, w.status FROM ledger_accounts a JOIN wallets w ON w.id = a.wallet_id WHERE a.wallet_id = ? AND a.currency = ?'
      ).get(walletId, row.currency) as {
        id: string; account_type: string; balance_minor: number;
        internal_balance_minor: number; pending_debits_minor: number; status: string;
      } | undefined;

      const source = accountForWallet(row.source_wallet_id);
      const destination = accountForWallet(row.destination_wallet_id);
      if (!source || !destination || source.account_type !== 'LIABILITY' || destination.account_type !== 'LIABILITY') {
        throw new Error('Both persistent wallets require linked LIABILITY ledger accounts.');
      }
      if (source.status !== 'ACTIVE' || destination.status !== 'ACTIVE' ||
          source.balance_minor !== source.internal_balance_minor ||
          destination.balance_minor !== destination.internal_balance_minor ||
          source.pending_debits_minor < amount ||
          source.internal_balance_minor < amount ||
          !Number.isSafeInteger(destination.internal_balance_minor + amount)) {
        throw new Error('Wallet, ledger-account or reservation projections are inconsistent.');
      }

      const batchId = 'lb_' + randomUUID();
      this.sql.prepare(
        "INSERT INTO ledger_batches (id, transaction_id, batch_type, currency, total_debits_minor, total_credits_minor, created_at) VALUES (?, ?, 'POSTING', ?, ?, ?, ?)"
      ).run(batchId, transactionId, row.currency, amount, amount, now);
      this.sql.prepare(
        "INSERT INTO ledger_entries (id, batch_id, account_id, currency, entry_type, amount_minor, description, created_at) VALUES (?, ?, ?, ?, 'DEBIT', ?, ?, ?)"
      ).run('le_' + randomUUID(), batchId, source.id, row.currency, amount, 'Internal transfer debit', now);
      this.sql.prepare(
        "INSERT INTO ledger_entries (id, batch_id, account_id, currency, entry_type, amount_minor, description, created_at) VALUES (?, ?, ?, ?, 'CREDIT', ?, ?, ?)"
      ).run('le_' + randomUUID(), batchId, destination.id, row.currency, amount, 'Internal transfer credit', now);

      this.sql.prepare('UPDATE ledger_batches SET posted_at = ? WHERE id = ? AND posted_at IS NULL')
        .run(now, batchId);
      const succeeded = this.sql.prepare(
        "UPDATE transactions SET status = 'SUCCEEDED', updated_at = ? WHERE id = ? AND user_id = ? AND status = 'PROCESSING'"
      ).run(now, transactionId, requesterUserId);
      if (succeeded.changes !== 1) throw new Error('Transaction could not enter SUCCEEDED after ledger posting.');

      this.sql.exec('COMMIT');
      const settled = this.readTransactionRow(transactionId);
      if (!settled) throw new Error('Settled transaction could not be reloaded.');
      return this.mapTransaction(settled);
    } catch (error) {
      try { this.sql.exec('ROLLBACK'); } catch { /* transaction may already have ended */ }
      throw error;
    }
  }

  /** Cancellation is owner-scoped; the SQL trigger releases any active reservation. */
  cancelInternalTransaction(transactionId: string, requesterUserId: string, reason: string): Transaction {
    this.sql.exec('BEGIN IMMEDIATE');
    try {
      const row = this.readTransactionRow(transactionId);
      if (!row || row.user_id !== requesterUserId) throw new Error('Transaction not found for authenticated user.');
      if (row.status === 'CANCELLED') {
        const activeReservation = this.sql.prepare(
          "SELECT 1 AS present FROM wallet_reservations WHERE transaction_id = ? AND status = 'ACTIVE'"
        ).get(transactionId);
        if (activeReservation) throw new Error('Cancelled transaction still has an active reservation.');
        this.sql.exec('COMMIT');
        return this.mapTransaction(row);
      }
      if (row.status !== 'CREATED' && row.status !== 'PENDING') {
        throw new Error('Only CREATED or PENDING transactions can be cancelled.');
      }
      const now = new Date().toISOString();
      const safeReason = typeof reason === 'string' ? reason.slice(0, 500) : 'User cancelled';
      const changed = this.sql.prepare(
        "UPDATE transactions SET status = 'CANCELLED', failure_reason = ?, updated_at = ? WHERE id = ? AND user_id = ? AND status IN ('CREATED', 'PENDING')"
      ).run(safeReason, now, transactionId, requesterUserId);
      if (changed.changes !== 1) throw new Error('Transaction state changed before cancellation.');

      this.sql.exec('COMMIT');
      const cancelled = this.readTransactionRow(transactionId);
      if (!cancelled) throw new Error('Cancelled transaction could not be reloaded.');
      return this.mapTransaction(cancelled);
    } catch (error) {
      try { this.sql.exec('ROLLBACK'); } catch { /* transaction may already have ended */ }
      throw error;
    }
  }

  /** Revoke durably; schema v4 makes revocation terminal. */
  revokeOrganizationMembership(userId: string, organizationId: string): boolean {
    if (!userId || !organizationId) return false;
    this.sql.exec('BEGIN IMMEDIATE');
    try {
      const result = this.sql.prepare(`
        UPDATE organization_memberships
        SET status = 'REVOKED', can_transact = 0
        WHERE organization_id = ? AND user_id = ? AND status = 'ACTIVE'
      `).run(organizationId, userId);
      this.sql.exec('COMMIT');
      return result.changes === 1;
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
