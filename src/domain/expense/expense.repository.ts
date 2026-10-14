import { getDatabase } from '@/storage/database/connection';
import type { Db, SqlValue } from '@/storage/database/db.types';
import type { IsoRange } from '@/utils/dates';

import type { EntryKind, Expense, PaymentMethod } from './expense.types';

export type CurrencyTotal = { currencyCode: string; totalMinor: number };

export type CategoryTime = { categoryId: string; occurredAt: string };

/** Amount suggestions appear once a category has this many expenses in the currency. */
export const SUGGESTION_MIN_HISTORY = 3;
const SUGGESTION_LIMIT = 3;

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
  /** Soft delete: hidden everywhere at once, recoverable with `restore` until purged (30 days). */
  remove(id: string): Promise<void>;
  /** Brings back a removed expense exactly as it was. */
  restore(id: string): Promise<void>;
  get(id: string): Promise<Expense | null>;
  /** Newest first. */
  listBetween(range: IsoRange): Promise<Expense[]>;
  /** Every matching expense, newest first. */
  search(filter: ExpenseFilter): Promise<Expense[]>;
  /** Per currency: amounts in different currencies are never added together. */
  totalsBetween(range: IsoRange): Promise<CurrencyTotal[]>;
  /**
   * Up to 3 amounts most often logged for a category in one currency since `since`: most used first, then most
   * recently used, then smallest. Empty until the category has `SUGGESTION_MIN_HISTORY` expenses in that window.
   */
  amountSuggestions(categoryId: string, currencyCode: string, since: string): Promise<number[]>;
  /** Category and time of every expense since `since` (for time-of-day defaults). */
  categoryTimes(since: string): Promise<CategoryTime[]>;
  /** Photo file names of every stored expense, deleted ones included (their photos are kept until the purge). */
  photoNames(): Promise<string[]>;
  /** Tells subscribers that expenses changed outside this repository (e.g. a restored backup). */
  notifyChanged(): void;
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
  kind: EntryKind;
  photo: string | null;
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
    ...(row.kind === 'income' ? { kind: 'income' as const } : {}),
    ...(row.photo ? { photo: row.photo } : {}),
    occurredAt: row.occurred_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const blankToNull = (value: string | undefined) => (value?.trim() ? value.trim() : null);

export function expenseParams(expense: Expense): SqlValue[] {
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
    expense.kind ?? 'expense',
    expense.photo ?? null,
  ];
}

/** Insert that skips an id already present: saves are idempotent (also used by backup restore). */
export const INSERT_EXPENSE_SQL = `INSERT INTO expenses (id, amount_minor, currency_code, category_id, title, note, occurred_at, payment_method, created_at, updated_at, kind, photo)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
   ON CONFLICT (id) DO NOTHING`;

/** Escapes LIKE wildcards (with `!`, see ESCAPE below) so user text matches literally. */
const likePattern = (text: string) => `%${text.replace(/[!%_]/g, (char) => `!${char}`)}%`;

export function createSqliteExpenseRepository(database: () => Promise<Db>): ExpenseRepository {
  const listeners = new Set<() => void>();
  const changed = () => listeners.forEach((listener) => listener());

  return {
    async save(expense) {
      const db = await database();
      await db.runAsync(INSERT_EXPENSE_SQL, expenseParams(expense));
      changed();
    },

    async saveMany(expenses) {
      const db = await database();
      await db.withExclusiveTransactionAsync(async (txn) => {
        for (const expense of expenses) await txn.runAsync(INSERT_EXPENSE_SQL, expenseParams(expense));
      });
      changed();
    },

    async update(expense) {
      const db = await database();
      const [id, ...rest] = expenseParams(expense);
      const result = await db.runAsync(
        `UPDATE expenses
         SET amount_minor = ?, currency_code = ?, category_id = ?, title = ?, note = ?,
             occurred_at = ?, payment_method = ?, created_at = ?, updated_at = ?, kind = ?, photo = ?
         WHERE id = ? AND deleted_at IS NULL`,
        [...rest, id],
      );
      if (result.changes === 0) throw new Error(`Expense ${expense.id} not found`);
      changed();
    },

    async remove(id) {
      const db = await database();
      await db.runAsync('UPDATE expenses SET deleted_at = ? WHERE id = ? AND deleted_at IS NULL', [
        new Date().toISOString(),
        id,
      ]);
      changed();
    },

    async restore(id) {
      const db = await database();
      await db.runAsync('UPDATE expenses SET deleted_at = NULL WHERE id = ?', [id]);
      changed();
    },

    async photoNames() {
      const db = await database();
      // From `expenses`, not `live_expenses`: a deleted expense keeps its photo until the purge removes the row
      const rows = await db.getAllAsync<{ photo: string }>('SELECT photo FROM expenses WHERE photo IS NOT NULL', []);
      return rows.map((row) => row.photo);
    },

    notifyChanged: changed,

    async get(id) {
      const db = await database();
      const row = await db.getFirstAsync<ExpenseRow>('SELECT * FROM live_expenses WHERE id = ?', [id]);
      return row ? fromRow(row) : null;
    },

    async listBetween({ start, end }) {
      const db = await database();
      const rows = await db.getAllAsync<ExpenseRow>(
        'SELECT * FROM live_expenses WHERE occurred_at >= ? AND occurred_at < ? ORDER BY occurred_at DESC, created_at DESC',
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
        `SELECT e.* FROM live_expenses e LEFT JOIN categories c ON c.id = e.category_id
         ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
         ORDER BY e.occurred_at DESC, e.created_at DESC`,
        params,
      );
      return rows.map(fromRow);
    },

    async totalsBetween({ start, end }) {
      const db = await database();
      const rows = await db.getAllAsync<{ currency_code: string; total_minor: number }>(
        `SELECT currency_code, SUM(amount_minor) AS total_minor FROM live_spending
         WHERE occurred_at >= ? AND occurred_at < ?
         GROUP BY currency_code ORDER BY total_minor DESC`,
        [start, end],
      );
      return rows.map((row) => ({ currencyCode: row.currency_code, totalMinor: row.total_minor }));
    },

    async amountSuggestions(categoryId, currencyCode, since) {
      const db = await database();
      const rows = await db.getAllAsync<{ amount_minor: number; uses: number }>(
        `SELECT amount_minor, COUNT(*) AS uses FROM live_spending
         WHERE category_id = ? AND currency_code = ? AND occurred_at >= ?
         GROUP BY amount_minor
         ORDER BY uses DESC, MAX(occurred_at) DESC, amount_minor ASC`,
        [categoryId, currencyCode, since],
      );
      const history = rows.reduce((sum, row) => sum + row.uses, 0);
      if (history < SUGGESTION_MIN_HISTORY) return [];
      return rows.slice(0, SUGGESTION_LIMIT).map((row) => row.amount_minor);
    },

    async categoryTimes(since) {
      const db = await database();
      const rows = await db.getAllAsync<{ category_id: string; occurred_at: string }>(
        'SELECT category_id, occurred_at FROM live_spending WHERE occurred_at >= ?',
        [since],
      );
      return rows.map((row) => ({ categoryId: row.category_id, occurredAt: row.occurred_at }));
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export const expenseRepository = createSqliteExpenseRepository(getDatabase);
