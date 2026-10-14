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
