import { BuiltInCategories } from '@/domain/category/builtInCategories';

import { LATEST_VERSION, migrate, migrations } from '../migrations';
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
    // v2: every existing expense is live (not deleted) and visible through the live view
    expect(await db.getAllAsync('SELECT id FROM live_expenses', [])).toEqual([{ id: 'e1' }]);
    expect(await db.getFirstAsync('SELECT deleted_at FROM expenses WHERE id = ?', ['e1'])).toEqual({ deleted_at: null });
    // User edits to categories survive: migrations never re-seed over them
    expect(await db.getFirstAsync('SELECT name, is_visible FROM categories WHERE id = ?', ['food'])).toEqual({
      name: 'Eating out',
      is_visible: 0,
    });
  });

  it('upgrades a database created by v2 (frozen schema snapshot) to repeating expenses without losing data', async () => {
    // Snapshot of what version 2 shipped. Never update it.
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
        created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT
      );
      CREATE INDEX expenses_occurred_at ON expenses (occurred_at);
      CREATE INDEX expenses_deleted_at ON expenses (deleted_at);
      CREATE VIEW live_expenses AS SELECT * FROM expenses WHERE deleted_at IS NULL;
      INSERT INTO categories VALUES ('home', 'Home', 'home', 'slate', 1, 1, 7, '2026-01-01T00:00:00.000Z');
      INSERT INTO expenses VALUES ('e1', 450000, 'MAD', 'home', 'Rent', NULL, '2026-07-01T13:00:00.000Z', NULL,
        '2026-07-01T13:00:00.000Z', '2026-07-01T13:00:00.000Z', NULL);
      PRAGMA user_version = 2;
    `);

    await migrate(db);

    expect(await version(db)).toBe(LATEST_VERSION);
    expect(await db.getAllAsync('SELECT id, amount_minor FROM live_expenses', [])).toEqual([{ id: 'e1', amount_minor: 450000 }]);
    // The new tables exist, start empty and accept a rule for the old expense
    expect(await db.getAllAsync('SELECT * FROM recurrences', [])).toEqual([]);
    await db.runAsync(
      // Columns named: later migrations add columns to this table
      `INSERT INTO recurrences (id, source_expense_id, frequency, anchor_at, amount_minor, currency_code, category_id,
        title, note, payment_method, active, created_at, updated_at)
       VALUES ('r1', 'e1', 'monthly', '2026-07-01T13:00:00.000Z', 450000, 'MAD', 'home', 'Rent', NULL, NULL, 1, 'x', 'x')`,
      [],
    );
    const occurrence = `INSERT INTO recurrence_occurrences (recurrence_id, occurrence, outcome, expense_id, handled_at)
      VALUES ('r1', 1, ?, NULL, 'x')`;
    await db.runAsync(occurrence, ['skipped']);
    await expect(db.runAsync(occurrence, ['confirmed'])).rejects.toThrow();
  });

  it('upgrades a database created by v3 (frozen schema snapshot) to income without losing data', async () => {
    // Snapshot of what version 3 shipped. Never update it.
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
        created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT
      );
      CREATE VIEW live_expenses AS SELECT * FROM expenses WHERE deleted_at IS NULL;
      CREATE TABLE recurrences (
        id TEXT PRIMARY KEY NOT NULL, source_expense_id TEXT NOT NULL, frequency TEXT NOT NULL, anchor_at TEXT NOT NULL,
        amount_minor INTEGER NOT NULL, currency_code TEXT NOT NULL, category_id TEXT NOT NULL REFERENCES categories (id),
        title TEXT, note TEXT, payment_method TEXT, active INTEGER NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
      );
      CREATE TABLE recurrence_occurrences (
        recurrence_id TEXT NOT NULL REFERENCES recurrences (id), occurrence INTEGER NOT NULL, outcome TEXT NOT NULL,
        expense_id TEXT, handled_at TEXT NOT NULL, PRIMARY KEY (recurrence_id, occurrence)
      );
      INSERT INTO categories VALUES ('food', 'Food', 'food', 'coral', 1, 1, 0, '2026-01-01T00:00:00.000Z');
      INSERT INTO expenses VALUES ('e1', 1200, 'EUR', 'food', NULL, NULL, '2026-10-01T12:00:00.000Z', NULL,
        '2026-10-01T12:00:00.000Z', '2026-10-01T12:00:00.000Z', NULL);
      PRAGMA user_version = 3;
    `);

    await migrate(db);

    expect(await version(db)).toBe(LATEST_VERSION);
    // Existing entries are expenses, and count as spending
    expect(await db.getAllAsync('SELECT id, kind FROM live_expenses', [])).toEqual([{ id: 'e1', kind: 'expense' }]);
    expect(await db.getAllAsync('SELECT id FROM live_spending', [])).toEqual([{ id: 'e1' }]);
    await expect(db.runAsync("UPDATE expenses SET kind = 'gift' WHERE id = 'e1'", [])).rejects.toThrow();
  });

  it('rolls a failing migration back completely and retries it on the next launch', async () => {
    const db = createTestDatabase();
    await migrate(db);
    let fail = true;
    migrations.push({
      version: LATEST_VERSION + 1,
      async up(txn) {
        await txn.execAsync('ALTER TABLE expenses ADD COLUMN tags TEXT');
        if (fail) throw new Error('disk full');
      },
    });
    try {
      await expect(migrate(db)).rejects.toThrow('disk full');
      // Half-applied schema change is gone and the version did not move
      expect(await version(db)).toBe(LATEST_VERSION);
      const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(expenses)', []);
      expect(columns.map((c) => c.name)).not.toContain('tags');

      fail = false;
      await migrate(db);
      expect(await version(db)).toBe(LATEST_VERSION + 1);
    } finally {
      migrations.pop();
    }
  });
});
