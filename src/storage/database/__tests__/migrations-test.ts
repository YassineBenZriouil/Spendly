import { BuiltInCategories } from '@/domain/category/builtInCategories';

import { LATEST_VERSION, migrate } from '../migrations';
import { createTestDatabase } from '../testing/createTestDatabase';

const version = async (db: ReturnType<typeof createTestDatabase>) =>
  (await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version', []))?.user_version;

describe('migrate', () => {
  it('creates the schema and seeds built-in categories on a fresh database', async () => {
    const db = createTestDatabase();
    await migrate(db);
    expect(await version(db)).toBe(LATEST_VERSION);
    const categories = await db.getAllAsync<{ id: string }>('SELECT id FROM categories ORDER BY sort_order', []);
    expect(categories.map((c) => c.id)).toEqual(BuiltInCategories.map((c) => c.id));
  });

  it('is a no-op when already up to date and keeps existing expenses', async () => {
    const db = createTestDatabase();
    await migrate(db);
    await db.runAsync(
      `INSERT INTO expenses (id, amount_minor, currency_code, category_id, occurred_at, created_at, updated_at)
       VALUES ('e1', 500, 'EUR', 'food', '2026-10-13T10:00:00.000Z', '2026-10-13T10:00:00.000Z', '2026-10-13T10:00:00.000Z')`,
      [],
    );
    await migrate(db);
    expect(await db.getAllAsync('SELECT id FROM expenses', [])).toEqual([{ id: 'e1' }]);
    expect(await db.getAllAsync('SELECT id FROM categories', [])).toHaveLength(BuiltInCategories.length);
  });

  it('rejects invalid rows at the database level', async () => {
    const db = createTestDatabase();
    await migrate(db);
    const insert = (amount: number, category: string) =>
      db.runAsync(
        `INSERT INTO expenses (id, amount_minor, currency_code, category_id, occurred_at, created_at, updated_at)
         VALUES (?, ?, 'EUR', ?, 'x', 'x', 'x')`,
        [`id-${amount}-${category}`, amount, category],
      );
    await expect(insert(0, 'food')).rejects.toThrow();
    await expect(insert(100, 'no-such-category')).rejects.toThrow();
  });

  it('upgrades a database created by v1 (frozen schema snapshot) without losing data', async () => {
    // Snapshot of what version 1 shipped. Never update it: it stands for real databases already on devices.
    const db = createTestDatabase();
    await db.execAsync(`
      CREATE TABLE categories (
        id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, icon TEXT NOT NULL, color_token TEXT NOT NULL,
        is_built_in INTEGER NOT NULL, is_visible INTEGER NOT NULL, sort_order INTEGER NOT NULL, created_at TEXT NOT NULL
      );
      CREATE TABLE expenses (
        id TEXT PRIMARY KEY NOT NULL, amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),
        currency_code TEXT NOT NULL, category_id TEXT NOT NULL REFERENCES categories (id),
        title TEXT, note TEXT, occurred_at TEXT NOT NULL, payment_method TEXT,
        created_at TEXT NOT NULL, updated_at TEXT NOT NULL
      );
      CREATE INDEX expenses_occurred_at ON expenses (occurred_at);
      INSERT INTO categories VALUES ('food', 'Eating out', 'food', 'coral', 1, 0, 3, '2026-01-01T00:00:00.000Z');
      INSERT INTO categories VALUES ('c1', 'Coffee', 'coffee', 'amber', 0, 1, 0, '2026-02-01T00:00:00.000Z');
      INSERT INTO expenses VALUES ('e1', 450, 'MAD', 'c1', 'Café', NULL, '2026-10-13T08:00:00.000Z', 'cash',
        '2026-10-13T08:00:00.000Z', '2026-10-13T08:00:00.000Z');
      PRAGMA user_version = 1;
    `);

    await migrate(db);

    expect(await version(db)).toBe(LATEST_VERSION);
    expect(await db.getAllAsync('SELECT id, amount_minor, category_id, title FROM expenses', [])).toEqual([
      { id: 'e1', amount_minor: 450, category_id: 'c1', title: 'Café' },
    ]);
    // User edits to categories survive: migrations never re-seed over them
    expect(await db.getFirstAsync('SELECT name, is_visible FROM categories WHERE id = ?', ['food'])).toEqual({
      name: 'Eating out',
      is_visible: 0,
    });
  });
});

