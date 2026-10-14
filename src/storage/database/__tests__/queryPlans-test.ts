import { createSqliteExpenseRepository } from '@/domain/expense/expense.repository';
import { createSqliteInsightsRepository } from '@/domain/insights/insights.repository';
import { localDayRange } from '@/utils/dates';

import type { Db, SqlValue } from '../db.types';
import { migrate } from '../migrations';
import { createTestDatabase } from '../testing/createTestDatabase';

jest.mock('expo-sqlite', () => ({}));

/** Runs the real repositories and records the SQL they read with, to check how SQLite would run each query. */
async function setup() {
  const db = createTestDatabase();
  await migrate(db);
  const reads: { sql: string; params: SqlValue[] }[] = [];
  const recording: Db = {
    ...db,
    async getAllAsync(sql, params) {
      reads.push({ sql, params });
      return db.getAllAsync(sql, params);
    },
    async getFirstAsync(sql, params) {
      reads.push({ sql, params });
      return db.getFirstAsync(sql, params);
    },
  };
  const plan = async (read: { sql: string; params: SqlValue[] }) =>
    (await db.getAllAsync<{ detail: string }>(`EXPLAIN QUERY PLAN ${read.sql}`, read.params)).map((row) => row.detail);
  return {
    expenses: createSqliteExpenseRepository(async () => recording),
    insights: createSqliteInsightsRepository(async () => recording),
    /** Plan of the last read. */
    lastPlan: () => plan(reads[reads.length - 1]),
  };
}

/** Reads the whole table without an index: what makes 10,000 entries slow. */
const fullScans = (plan: string[]) => plan.filter((step) => /^SCAN (e|expenses)$/.test(step));
/** Reads only the rows inside the date range, through an index. */
const readsRangeOnly = (plan: string[]) => plan.some((step) => /USING (COVERING )?INDEX \w+ \(.*occurred_at>\?/.test(step));

const DAY = localDayRange(new Date(2026, 9, 13, 12));

describe('query plans (10,000 entries stay fast)', () => {
  it('Activity reads in index order, without sorting every row, with and without a category filter', async () => {
    const { expenses, lastPlan } = await setup();
    for (const filter of [{}, { categoryId: 'food' }, { text: 'coffee' }]) {
      await expenses.search(filter);
      const plan = await lastPlan();
      expect(fullScans(plan)).toEqual([]);
      expect(plan.filter((step) => step.includes('TEMP B-TREE FOR ORDER BY'))).toEqual([]);
    }
    await expenses.search({ categoryId: 'food' });
    expect((await lastPlan()).join(' | ')).toMatch(/expenses_live_by_category/);
  });

  it('day totals and Insights read only the rows in their date range', async () => {
    const { expenses, insights, lastPlan } = await setup();
    const reads = [
      () => expenses.totalsBetween(DAY),
      () => expenses.listBetween(DAY),
      () => insights.totalsByCurrency(DAY),
      () => insights.byCategory(DAY, 'EUR'),
      () => insights.byCategoryInRanges([DAY, DAY], 'EUR'),
      () => insights.daily([DAY, DAY], 'EUR'),
      () => insights.incomeTotal(DAY, 'EUR'),
    ];
    for (const read of reads) {
      await read();
      const plan = await lastPlan();
      expect(fullScans(plan)).toEqual([]);
      expect(readsRangeOnly(plan)).toBe(true);
    }
    await insights.firstExpenseAt();
    expect(fullScans(await lastPlan())).toEqual([]);
  });
});
