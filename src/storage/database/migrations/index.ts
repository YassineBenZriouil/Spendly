import { BuiltInCategories } from '@/domain/category/builtInCategories';

import type { Db } from '../db.types';

type Migration = {
  version: number;
  up: (txn: Db) => Promise<void>;
};

/**
 * Append-only. Never edit a shipped migration; add a new version instead.
 * Each runs in its own exclusive transaction together with the `user_version` bump.
 */
export const migrations: Migration[] = [
  {
    version: 1,
    async up(txn) {
      await txn.execAsync(`
        CREATE TABLE categories (
          id TEXT PRIMARY KEY NOT NULL,
          name TEXT NOT NULL,
          icon TEXT NOT NULL,
          color_token TEXT NOT NULL,
          is_built_in INTEGER NOT NULL,
          is_visible INTEGER NOT NULL,
          sort_order INTEGER NOT NULL,
          created_at TEXT NOT NULL
        );

        CREATE TABLE expenses (
          id TEXT PRIMARY KEY NOT NULL,
          amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),
          currency_code TEXT NOT NULL,
          category_id TEXT NOT NULL REFERENCES categories (id),
          title TEXT,
          note TEXT,
          occurred_at TEXT NOT NULL,
          payment_method TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE INDEX expenses_occurred_at ON expenses (occurred_at);
      `);

      for (const category of BuiltInCategories) {
        await txn.runAsync(
          `INSERT INTO categories (id, name, icon, color_token, is_built_in, is_visible, sort_order, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            category.id,
            category.name,
            category.icon,
            category.colorToken,
            1,
            category.isVisible ? 1 : 0,
            category.sortOrder,
            category.createdAt,
          ],
        );
      }
    },
  },
  {
    // Soft delete: a deleted expense stays recoverable (Undo, even after a restart) until it is purged.
    // Reads go through `live_expenses`, so no query can forget to exclude deleted rows.
    version: 2,
    async up(txn) {
      await txn.execAsync(`
        ALTER TABLE expenses ADD COLUMN deleted_at TEXT;
        CREATE INDEX expenses_deleted_at ON expenses (deleted_at);
        CREATE VIEW live_expenses AS SELECT * FROM expenses WHERE deleted_at IS NULL;
      `);
    },
  },
  {
    // Repeating expenses (Stage 2 Phase 2): a rule copied from an expense, and every occurrence the user confirmed or
    // skipped. Nothing is saved for an occurrence until it is confirmed.
    version: 3,
    async up(txn) {
      await txn.execAsync(`
        CREATE TABLE recurrences (
          id TEXT PRIMARY KEY NOT NULL,
          source_expense_id TEXT NOT NULL,
          frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
          anchor_at TEXT NOT NULL,
          amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),
          currency_code TEXT NOT NULL,
          category_id TEXT NOT NULL REFERENCES categories (id),
          title TEXT,
          note TEXT,
          payment_method TEXT,
          active INTEGER NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE INDEX recurrences_source ON recurrences (source_expense_id);

        CREATE TABLE recurrence_occurrences (
          recurrence_id TEXT NOT NULL REFERENCES recurrences (id),
          occurrence INTEGER NOT NULL CHECK (occurrence > 0),
          outcome TEXT NOT NULL CHECK (outcome IN ('confirmed', 'skipped')),
          expense_id TEXT,
          handled_at TEXT NOT NULL,
          PRIMARY KEY (recurrence_id, occurrence)
        );
        CREATE INDEX recurrence_occurrences_expense ON recurrence_occurrences (expense_id);
      `);
    },
  },
  {
    // Income (Stage 2 Phase 3): an entry is an expense (default) or income. Spending totals, Insights and budgets read
    // `live_spending`, so income can never be counted as spending by a query that forgets to filter it.
    version: 4,
    async up(txn) {
      await txn.execAsync(`
        ALTER TABLE expenses ADD COLUMN kind TEXT NOT NULL DEFAULT 'expense' CHECK (kind IN ('expense', 'income'));
        ALTER TABLE recurrences ADD COLUMN kind TEXT NOT NULL DEFAULT 'expense' CHECK (kind IN ('expense', 'income'));
        CREATE VIEW live_spending AS SELECT * FROM live_expenses WHERE kind = 'expense';
      `);
    },
  },
];

export const LATEST_VERSION = migrations[migrations.length - 1].version;

export async function migrate(db: Db) {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version', []);
  const current = row?.user_version ?? 0;

  for (const migration of migrations) {
    if (migration.version <= current) continue;
    await db.withExclusiveTransactionAsync(async (txn) => {
      await migration.up(txn);
      // PRAGMA can't take bound parameters; version is a trusted integer constant
      await txn.execAsync(`PRAGMA user_version = ${migration.version}`);
    });
  }
}
