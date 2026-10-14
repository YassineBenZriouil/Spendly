import { getDatabase } from '@/storage/database/connection';
import type { Db, SqlValue } from '@/storage/database/db.types';
import type { IsoRange } from '@/utils/dates';

export type CategorySpend = { categoryId: string; totalMinor: number; count: number };

/** Aggregations for Insights, all in SQL. Ranges come from JS so local days (and DST) are exact. */
export type InsightsRepository = {
  /** Per currency, largest first. Currencies are never added together. */
  totalsByCurrency(range: IsoRange): Promise<{ currencyCode: string; totalMinor: number; count: number }[]>;
  byCategory(range: IsoRange, currencyCode: string): Promise<CategorySpend[]>;
  /** Total per day, in the order of `days`; 0 for days without expenses. */
  daily(days: IsoRange[], currencyCode: string): Promise<number[]>;
  /** When the very first expense happened, or null if there are none. */
  firstExpenseAt(): Promise<string | null>;
};

export function createSqliteInsightsRepository(database: () => Promise<Db>): InsightsRepository {
  return {
    async totalsByCurrency({ start, end }) {
      const db = await database();
      const rows = await db.getAllAsync<{ currency_code: string; total_minor: number; count: number }>(
        `SELECT currency_code, SUM(amount_minor) AS total_minor, COUNT(*) AS count FROM live_expenses
         WHERE occurred_at >= ? AND occurred_at < ?
         GROUP BY currency_code ORDER BY total_minor DESC`,
        [start, end],
      );
      return rows.map((row) => ({ currencyCode: row.currency_code, totalMinor: row.total_minor, count: row.count }));
    },

    async byCategory({ start, end }, currencyCode) {
      const db = await database();
      const rows = await db.getAllAsync<{ category_id: string; total_minor: number; count: number }>(
        `SELECT category_id, SUM(amount_minor) AS total_minor, COUNT(*) AS count FROM live_expenses
         WHERE occurred_at >= ? AND occurred_at < ? AND currency_code = ?
         GROUP BY category_id ORDER BY total_minor DESC, count DESC`,
        [start, end, currencyCode],
      );
      return rows.map((row) => ({ categoryId: row.category_id, totalMinor: row.total_minor, count: row.count }));
    },

    async daily(days, currencyCode) {
      if (days.length === 0) return [];
      const db = await database();
      // One row per local day, joined in SQL: VALUES (index, start, end), …
      const values = days.map(() => '(?, ?, ?)').join(', ');
      const params: SqlValue[] = days.flatMap((day, index) => [index, day.start, day.end]);
      const rows = await db.getAllAsync<{ day: number; total_minor: number }>(
        `WITH days (day, start, end) AS (VALUES ${values})
         SELECT days.day AS day, SUM(e.amount_minor) AS total_minor
         FROM days JOIN live_expenses e ON e.occurred_at >= days.start AND e.occurred_at < days.end
         WHERE e.currency_code = ?
         GROUP BY days.day`,
        [...params, currencyCode],
      );
      const totals = days.map(() => 0);
      for (const row of rows) totals[row.day] = row.total_minor;
      return totals;
    },

    async firstExpenseAt() {
      const db = await database();
      const row = await db.getFirstAsync<{ first: string | null }>('SELECT MIN(occurred_at) AS first FROM live_expenses', []);
      return row?.first ?? null;
    },
  };
}

export const insightsRepository = createSqliteInsightsRepository(getDatabase);
