import { BuiltInCategories } from '@/domain/category/builtInCategories';
import { parseCategory } from '@/domain/category/category.parse';
import type { ExpenseCategory } from '@/domain/category/category.types';
import { parseExpense } from '@/domain/expense/expense.parse';
import type { Expense } from '@/domain/expense/expense.types';

/** Bump when the file layout changes; older apps then refuse newer files instead of misreading them. */
export const BACKUP_FORMAT = 1;

/** Everything needed to rebuild Spendly on another phone. No backend: the user keeps and moves this file. */
export type Backup = {
  app: 'spendly';
  format: typeof BACKUP_FORMAT;
  createdAt: string;
  expenses: Expense[];
  categories: ExpenseCategory[];
  /** Validated again when applied (only known, valid settings are restored). */
  preferences: Record<string, unknown>;
};

export function createBackup(
  { expenses, categories, preferences }: { expenses: Expense[]; categories: ExpenseCategory[]; preferences: object },
  now = new Date(),
): Backup {
  return {
    app: 'spendly',
    format: BACKUP_FORMAT,
    createdAt: now.toISOString(),
    expenses,
    categories,
    preferences: { ...preferences },
  };
}

export type BackupParseResult = { ok: true; backup: Backup } | { ok: false; reason: string };

const NOT_A_BACKUP = "This file isn't a Spendly backup.";
const damaged = (detail: string) => `This backup is damaged (${detail}). Nothing was restored.`;

const hasDuplicates = (ids: string[]) => new Set(ids).size !== ids.length;

/**
 * Reads a backup file and checks all of it before anything touches the database: one bad record rejects the whole
 * file, so a restore is never partial.
 */
export function parseBackup(text: string): BackupParseResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, reason: NOT_A_BACKUP };
  }
  if (!data || typeof data !== 'object') return { ok: false, reason: NOT_A_BACKUP };
  const file = data as Record<string, unknown>;
  if (file.app !== 'spendly' || typeof file.format !== 'number') return { ok: false, reason: NOT_A_BACKUP };
  if (file.format > BACKUP_FORMAT) {
    return { ok: false, reason: 'This backup was made by a newer version of Spendly. Update the app, then try again.' };
  }
  if (file.format !== BACKUP_FORMAT || !Array.isArray(file.expenses) || !Array.isArray(file.categories)) {
    return { ok: false, reason: NOT_A_BACKUP };
  }
  if (typeof file.createdAt !== 'string' || Number.isNaN(Date.parse(file.createdAt))) {
    return { ok: false, reason: damaged('its date is unreadable') };
  }

  const categories = file.categories.map(parseCategory);
  const badCategories = categories.filter((category) => category === null).length;
  if (badCategories > 0) return { ok: false, reason: damaged(`${badCategories} unreadable ${badCategories === 1 ? 'category' : 'categories'}`) };
  const expenses = file.expenses.map(parseExpense);
  const badExpenses = expenses.filter((expense) => expense === null).length;
  if (badExpenses > 0) return { ok: false, reason: damaged(`${badExpenses} unreadable ${badExpenses === 1 ? 'expense' : 'expenses'}`) };

  const validCategories = categories as ExpenseCategory[];
  const validExpenses = expenses as Expense[];
  if (hasDuplicates(validCategories.map((c) => c.id)) || hasDuplicates(validExpenses.map((e) => e.id))) {
    return { ok: false, reason: damaged('some records appear twice') };
  }
  const known = new Set([...validCategories, ...BuiltInCategories].map((category) => category.id));
  if (validExpenses.some((expense) => !known.has(expense.categoryId))) {
    return { ok: false, reason: damaged('some expenses refer to categories that are missing') };
  }

  const preferences = file.preferences && typeof file.preferences === 'object' ? (file.preferences as Record<string, unknown>) : {};
  return {
    ok: true,
    backup: {
      app: 'spendly',
      format: BACKUP_FORMAT,
      createdAt: file.createdAt,
      expenses: validExpenses,
      categories: validCategories,
      preferences,
    },
  };
}
