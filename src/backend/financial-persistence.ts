/**
 * Durable SQLite snapshot store for the current financial domain model.
 *
 * This is an incremental persistence boundary: every API response commits the
 * complete domain snapshot in one SQLite transaction. It prevents restart data
 * loss, but is not yet a normalized ledger schema or a substitute for moving
 * each financial command into a single SQL transaction.
 */
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

const dbPath = path.resolve(process.env.FINANCIAL_DATABASE_PATH || 'data/kashflow-financial.sqlite');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const sql = new Database(dbPath);
sql.pragma('journal_mode = WAL');
sql.pragma('synchronous = FULL');
sql.pragma('foreign_keys = ON');
sql.exec(`
  CREATE TABLE IF NOT EXISTS financial_state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    schema_version INTEGER NOT NULL,
    payload TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`);

type DomainState = {
  users: Map<string, unknown>;
  organizations: Map<string, unknown>;
  memberships: Map<string, unknown>;
  wallets: Map<string, unknown>;
  ledgerAccounts: Map<string, unknown>;
  ledgerEntries: unknown[];
  transactions: Map<string, unknown>;
  idempotencyStore: Map<string, unknown>;
  cryptoPositions: Map<string, unknown>;
  auditLogs: unknown[];
  aiMessages: unknown[];
};

const mapFields = [
  'users', 'organizations', 'memberships', 'wallets', 'ledgerAccounts',
  'transactions', 'idempotencyStore', 'cryptoPositions',
] as const;
const arrayFields = ['ledgerEntries', 'auditLogs', 'aiMessages'] as const;

export function restoreFinancialState(target: DomainState): boolean {
  const row = sql.prepare('SELECT schema_version, payload FROM financial_state WHERE id = 1').get() as
    { schema_version: number; payload: string } | undefined;
  if (!row) return false;
  if (row.schema_version !== 1) throw new Error('Unsupported financial database schema version.');

  const snapshot = JSON.parse(row.payload);
  for (const field of mapFields) {
    if (!Array.isArray(snapshot[field])) throw new Error(`Invalid persisted financial map: ${field}`);
    (target[field] as Map<string, unknown>).clear();
    for (const [key, value] of snapshot[field]) (target[field] as Map<string, unknown>).set(key, value);
  }
  for (const field of arrayFields) {
    if (!Array.isArray(snapshot[field])) throw new Error(`Invalid persisted financial list: ${field}`);
    (target[field] as unknown[]).splice(0, (target[field] as unknown[]).length, ...snapshot[field]);
  }
  return true;
}

export function persistFinancialState(source: DomainState): void {
  const snapshot: Record<string, unknown> = {};
  for (const field of mapFields) snapshot[field] = Array.from(source[field].entries());
  for (const field of arrayFields) snapshot[field] = source[field];

  const payload = JSON.stringify(snapshot);
  const commit = sql.transaction(() => {
    sql.prepare(`
      INSERT INTO financial_state(id, schema_version, payload, updated_at)
      VALUES(1, 1, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        schema_version = excluded.schema_version,
        payload = excluded.payload,
        updated_at = excluded.updated_at
    `).run(payload, new Date().toISOString());
  });
  commit();
}
