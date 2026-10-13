import { getDatabase } from '@/storage/database/connection';
import type { Db } from '@/storage/database/db.types';

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
};

export function createSqliteCategoryRepository(database: () => Promise<Db>): CategoryRepository {
  return {
    async list() {
      const db = await database();
      const rows = await db.getAllAsync<CategoryRow>('SELECT * FROM categories ORDER BY sort_order, name', []);
      return rows.map(fromRow);
    },
  };
}

export const categoryRepository = createSqliteCategoryRepository(getDatabase);
