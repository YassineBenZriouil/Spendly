import { getDatabase } from '@/storage/database/connection';
import type { Db, SqlValue } from '@/storage/database/db.types';
import type { IsoRange } from '@/utils/dates';

export type CategorySpend = { categoryId: string; totalMinor: number; count: number };

/** Aggregations for Insights, all in SQL. Ranges come from JS so local days (and DST) are exact. */
export type InsightsRepository = {
  /** Per currency, largest first. Currencies are never added together. */
  totalsByCurrency(range: IsoRange): Promise<{ currencyCode: string; totalMinor: number; count: number }[]>;
  byCategory(range: IsoRange, currencyCode: string): Promise<CategorySpend[]>;
  /** `byCategory` for several ranges in one query (the Insights baseline), in the order of `ranges`. */
  byCategoryInRanges(ranges: IsoRange[], currencyCode: string): Promise<CategorySpend[][]>;
  /** Total per day, in the order of `days`; 0 for days without expenses. */
  daily(days: IsoRange[], currencyCode: string): Promise<number[]>;
  /** Income in one currency over a range (Net in Insights). */
  incomeTotal(range: IsoRange, currencyCode: string): Promise<number>;
  /** When the very first entry (expense or income) happened, or null if there are none. */
  firstExpenseAt(): Promise<string | null>;
};

export function createSqliteInsightsRepository(database: () => Promise<Db>): InsightsRepository {
  return {
    async totalsByCurrency({ start, end }) {
      const db = await database();
      const rows = await db.getAllAsync<{ currency_code: string; total_minor: number; count: number }>(
        `SELECT currency_code, SUM(amount_minor) AS total_minor, COUNT(*) AS count FROM live_spending
         WHERE occurred_at >= ? AND occurred_at < ?
         GROUP BY currency_code ORDER BY total_minor DESC`,
        [start, end],
      );
      return rows.map((row) => ({ currencyCode: row.currency_code, totalMinor: row.total_minor, count: row.count }));
    },

    async byCategory({ start, end }, currencyCode) {
      const db = await database();
      const rows = await db.getAllAsync<{ category_id: string; total_minor: number; count: number }>(
        `SELECT category_id, SUM(amount_minor) AS total_minor, COUNT(*) AS count FROM live_spending
         WHERE occurred_at >= ? AND occurred_at < ? AND currency_code = ?
         GROUP BY category_id ORDER BY total_minor DESC, count DESC`,
        [start, end, currencyCode],
      );
      return rows.map((row) => ({ categoryId: row.category_id, totalMinor: row.total_minor, count: row.count }));
    },

    async byCategoryInRanges(ranges, currencyCode) {
      if (ranges.length === 0) return [];
      const db = await database();
      const values = ranges.map(() => '(?, ?, ?)').join(', ');
      const params: SqlValue[] = ranges.flatMap((range, index) => [index, range.start, range.end]);
      const rows = await db.getAllAsync<{ window: number; category_id: string; total_minor: number; count: number }>(
        `WITH windows (window, start, end) AS (VALUES ${values})
         SELECT windows.window AS window, e.category_id AS category_id, SUM(e.amount_minor) AS total_minor, COUNT(*) AS count
         FROM windows JOIN live_spending e ON e.occurred_at >= windows.start AND e.occurred_at < windows.end
         WHERE e.currency_code = ?
         GROUP BY windows.window, e.category_id
         ORDER BY windows.window, total_minor DESC, count DESC`,
        [...params, currencyCode],
      );
      const spend: CategorySpend[][] = ranges.map(() => []);
      for (const row of rows) spend[row.window].push({ categoryId: row.category_id, totalMinor: row.total_minor, count: row.count });
      return spend;
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
         FROM days JOIN live_spending e ON e.occurred_at >= days.start AND e.occurred_at < days.end
         WHERE e.currency_code = ?
         GROUP BY days.day`,
        [...params, currencyCode],
      );
      const totals = days.map(() => 0);
      for (const row of rows) totals[row.day] = row.total_minor;
      return totals;
    },

    async incomeTotal({ start, end }, currencyCode) {
      const db = await database();
      const row = await db.getFirstAsync<{ total: number | null }>(
        `SELECT SUM(amount_minor) AS total FROM live_expenses
         WHERE kind = 'income' AND occurred_at >= ? AND occurred_at < ? AND currency_code = ?`,
        [start, end, currencyCode],
      );
      return row?.total ?? 0;
    },

    async firstExpenseAt() {
      const db = await database();
      const row = await db.getFirstAsync<{ first: string | null }>('SELECT MIN(occurred_at) AS first FROM live_expenses', []);
      return row?.first ?? null;
    },
  };
}

export const insightsRepository = createSqliteInsightsRepository(getDatabase);
