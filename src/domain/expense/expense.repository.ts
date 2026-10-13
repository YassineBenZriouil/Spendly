import { getDatabase } from '@/storage/database/connection';
import type { Db, SqlValue } from '@/storage/database/db.types';
import type { IsoRange } from '@/utils/dates';

import type { Expense, PaymentMethod } from './expense.types';

export type CurrencyTotal = { currencyCode: string; totalMinor: number };

export type ExpenseFilter = {
  /** Matched against title, note and category name (SQLite LIKE: case-insensitive for ASCII only). */
  text?: string;
  categoryId?: string;
};

/** Persistence boundary for expenses. Sync (later) plugs in behind this interface. */
export type ExpenseRepository = {
  /** Idempotent: saving the same id twice keeps one record. */
  save(expense: Expense): Promise<void>;
  /** One transaction and one change notification, for bulk inserts. */
  saveMany(expenses: Expense[]): Promise<void>;
  update(expense: Expense): Promise<void>;
  remove(id: string): Promise<void>;
  get(id: string): Promise<Expense | null>;
  /** Newest first. */
  listBetween(range: IsoRange): Promise<Expense[]>;
  /** Every matching expense, newest first. */
  search(filter: ExpenseFilter): Promise<Expense[]>;
  /** Per currency: amounts in different currencies are never added together. */
  totalsBetween(range: IsoRange): Promise<CurrencyTotal[]>;
  /** Called after every successful write. Returns an unsubscribe function. */
  subscribe(listener: () => void): () => void;
};

type ExpenseRow = {
  id: string;
  amount_minor: number;
  currency_code: string;
  category_id: string;
  title: string | null;
  note: string | null;
  occurred_at: string;
  payment_method: PaymentMethod | null;
  created_at: string;
  updated_at: string;
};

function fromRow(row: ExpenseRow): Expense {
  return {
    id: row.id,
    amountMinor: row.amount_minor,
    currencyCode: row.currency_code,
    categoryId: row.category_id,
    // Optional fields are omitted, never stored or returned as empty strings
    ...(row.title ? { title: row.title } : {}),
    ...(row.note ? { note: row.note } : {}),
    ...(row.payment_method ? { paymentMethod: row.payment_method } : {}),
    occurredAt: row.occurred_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const blankToNull = (value: string | undefined) => (value?.trim() ? value.trim() : null);

function toParams(expense: Expense): SqlValue[] {
  return [
    expense.id,
    expense.amountMinor,
    expense.currencyCode,
    expense.categoryId,
    blankToNull(expense.title),
    blankToNull(expense.note),
    expense.occurredAt,
    expense.paymentMethod ?? null,
    expense.createdAt,
    expense.updatedAt,
  ];
}

const INSERT_SQL = `INSERT INTO expenses (id, amount_minor, currency_code, category_id, title, note, occurred_at, payment_method, created_at, updated_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
   ON CONFLICT (id) DO NOTHING`;

/** Escapes LIKE wildcards (with `!`, see ESCAPE below) so user text matches literally. */
const likePattern = (text: string) => `%${text.replace(/[!%_]/g, (char) => `!${char}`)}%`;

export function createSqliteExpenseRepository(database: () => Promise<Db>): ExpenseRepository {
  const listeners = new Set<() => void>();
  const changed = () => listeners.forEach((listener) => listener());

  return {
    async save(expense) {
      const db = await database();
      await db.runAsync(INSERT_SQL, toParams(expense));
      changed();
    },

    async saveMany(expenses) {
      const db = await database();
      await db.withExclusiveTransactionAsync(async (txn) => {
        for (const expense of expenses) await txn.runAsync(INSERT_SQL, toParams(expense));
      });
      changed();
    },

    async update(expense) {
      const db = await database();
      const [id, ...rest] = toParams(expense);
      const result = await db.runAsync(
        `UPDATE expenses
         SET amount_minor = ?, currency_code = ?, category_id = ?, title = ?, note = ?,
             occurred_at = ?, payment_method = ?, created_at = ?, updated_at = ?
         WHERE id = ?`,
        [...rest, id],
      );
      if (result.changes === 0) throw new Error(`Expense ${expense.id} not found`);
      changed();
    },

    async remove(id) {
      const db = await database();
      await db.runAsync('DELETE FROM expenses WHERE id = ?', [id]);
      changed();
    },

    async get(id) {
      const db = await database();
      const row = await db.getFirstAsync<ExpenseRow>('SELECT * FROM expenses WHERE id = ?', [id]);
      return row ? fromRow(row) : null;
    },

    async listBetween({ start, end }) {
      const db = await database();
      const rows = await db.getAllAsync<ExpenseRow>(
        'SELECT * FROM expenses WHERE occurred_at >= ? AND occurred_at < ? ORDER BY occurred_at DESC, created_at DESC',
        [start, end],
      );
      return rows.map(fromRow);
    },

    async search({ text, categoryId }) {
      const db = await database();
      const where: string[] = [];
      const params: SqlValue[] = [];
      const query = text?.trim();
      if (query) {
        const pattern = likePattern(query);
        where.push(`(e.title LIKE ? ESCAPE '!' OR e.note LIKE ? ESCAPE '!' OR c.name LIKE ? ESCAPE '!')`);
        params.push(pattern, pattern, pattern);
      }
      if (categoryId) {
        where.push('e.category_id = ?');
        params.push(categoryId);
      }
      // shortcut: loads every match into memory (fine for thousands of rows); page with LIMIT/OFFSET if histories get far bigger
      const rows = await db.getAllAsync<ExpenseRow>(
        `SELECT e.* FROM expenses e LEFT JOIN categories c ON c.id = e.category_id
         ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
         ORDER BY e.occurred_at DESC, e.created_at DESC`,
        params,
      );
      return rows.map(fromRow);
    },

    async totalsBetween({ start, end }) {
      const db = await database();
      const rows = await db.getAllAsync<{ currency_code: string; total_minor: number }>(
        `SELECT currency_code, SUM(amount_minor) AS total_minor FROM expenses
         WHERE occurred_at >= ? AND occurred_at < ?
         GROUP BY currency_code ORDER BY total_minor DESC`,
        [start, end],
      );
      return rows.map((row) => ({ currencyCode: row.currency_code, totalMinor: row.total_minor }));
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export const expenseRepository = createSqliteExpenseRepository(getDatabase);
