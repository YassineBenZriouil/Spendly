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
});
