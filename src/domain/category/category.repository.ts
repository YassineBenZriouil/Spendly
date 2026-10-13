import { getDatabase } from '@/storage/database/connection';
import type { Db } from '@/storage/database/db.types';

import { BuiltInCategories } from './builtInCategories';
import type { ExpenseCategory } from './category.types';

type CategoryRow = {
  id: string;
  name: string;
  icon: ExpenseCategory['icon'];
  color_token: ExpenseCategory['colorToken'];
  is_built_in: number;
  is_visible: number;
  sort_order: number;
  created_at: string;
};

function fromRow(row: CategoryRow): ExpenseCategory {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    colorToken: row.color_token,
    isBuiltIn: row.is_built_in === 1,
    isVisible: row.is_visible === 1,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

export type CategoryRepository = {
  /** All categories, hidden ones included (old expenses still need their names), in display order. */
  list(): Promise<ExpenseCategory[]>;
  /** Idempotent on id. */
  add(category: ExpenseCategory): Promise<void>;
  /** Name, icon, color and visibility. The id never changes: expenses reference it. */
  update(category: ExpenseCategory): Promise<void>;
  /** Display order = position in `ids`. */
  reorder(ids: string[]): Promise<void>;
  /** Built-ins get their original name, icon, color, order and visibility back; custom ones are kept after them. */
  restoreDefaults(): Promise<void>;
  /** Called after every successful write. Returns an unsubscribe function. */
  subscribe(listener: () => void): () => void;
};

export function createSqliteCategoryRepository(database: () => Promise<Db>): CategoryRepository {
  const listeners = new Set<() => void>();
  const changed = () => listeners.forEach((listener) => listener());

  const list = async () => {
    const db = await database();
    const rows = await db.getAllAsync<CategoryRow>('SELECT * FROM categories ORDER BY sort_order, name', []);
    return rows.map(fromRow);
  };

  return {
    list,

    async add(category) {
      const db = await database();
      await db.runAsync(
        `INSERT INTO categories (id, name, icon, color_token, is_built_in, is_visible, sort_order, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (id) DO NOTHING`,
        [
          category.id,
          category.name,
          category.icon,
          category.colorToken,
          category.isBuiltIn ? 1 : 0,
          category.isVisible ? 1 : 0,
          category.sortOrder,
          category.createdAt,
        ],
      );
      changed();
    },

    async update(category) {
      const db = await database();
      const result = await db.runAsync(
        'UPDATE categories SET name = ?, icon = ?, color_token = ?, is_visible = ? WHERE id = ?',
        [category.name, category.icon, category.colorToken, category.isVisible ? 1 : 0, category.id],
      );
      if (result.changes === 0) throw new Error(`Category ${category.id} not found`);
      changed();
    },

    async reorder(ids) {
      const db = await database();
      await db.withExclusiveTransactionAsync(async (txn) => {
        for (const [index, id] of ids.entries()) {
          await txn.runAsync('UPDATE categories SET sort_order = ? WHERE id = ?', [index, id]);
        }
      });
      changed();
    },

    async restoreDefaults() {
      const db = await database();
      const custom = (await list()).filter((category) => !category.isBuiltIn);
      await db.withExclusiveTransactionAsync(async (txn) => {
        for (const category of BuiltInCategories) {
          await txn.runAsync(
            'UPDATE categories SET name = ?, icon = ?, color_token = ?, is_visible = 1, sort_order = ? WHERE id = ?',
            [category.name, category.icon, category.colorToken, category.sortOrder, category.id],
          );
        }
        for (const [index, category] of custom.entries()) {
          await txn.runAsync('UPDATE categories SET sort_order = ? WHERE id = ?', [
            BuiltInCategories.length + index,
            category.id,
          ]);
        }
      });
      changed();
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export const categoryRepository = createSqliteCategoryRepository(getDatabase);
