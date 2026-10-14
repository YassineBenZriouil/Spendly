import { BuiltInCategories } from '@/domain/category/builtInCategories';
import { parseCategory } from '@/domain/category/category.parse';
import type { ExpenseCategory } from '@/domain/category/category.types';
import { parseExpense } from '@/domain/expense/expense.parse';
import type { Expense } from '@/domain/expense/expense.types';
import { parseHandledOccurrence, parseRecurrence } from '@/domain/recurrence/recurrence.parse';
import type { HandledOccurrence, Recurrence } from '@/domain/recurrence/recurrence.types';
import { t } from '@/i18n';

/** Bump when the file layout changes; older apps then refuse newer files instead of misreading them. */
export const BACKUP_FORMAT = 2;
/** Oldest file layout this version still reads (1: before repeating expenses). */
const OLDEST_FORMAT = 1;

/** Everything needed to rebuild Spendly on another phone. No backend: the user keeps and moves this file. */
export type Backup = {
  app: 'spendly';
  format: typeof BACKUP_FORMAT;
  createdAt: string;
  expenses: Expense[];
  categories: ExpenseCategory[];
  /** Repeating expense rules and their confirmed / skipped occurrences (format 2; empty when reading format 1). */
  recurrences: Recurrence[];
  occurrences: HandledOccurrence[];
  /** Validated again when applied (only known, valid settings are restored). */
  preferences: Record<string, unknown>;
};

export function createBackup(
  {
    expenses,
    categories,
    preferences,
    recurrences = [],
    occurrences = [],
  }: {
    expenses: Expense[];
    categories: ExpenseCategory[];
    preferences: object;
    recurrences?: Recurrence[];
    occurrences?: HandledOccurrence[];
  },
  now = new Date(),
): Backup {
  return {
    app: 'spendly',
    format: BACKUP_FORMAT,
    createdAt: now.toISOString(),
    expenses,
    categories,
    recurrences,
    occurrences,
    preferences: { ...preferences },
  };
}

export type BackupParseResult = { ok: true; backup: Backup } | { ok: false; reason: string };

const NOT_A_BACKUP = t('data.parse.notABackup');
const damaged = (detail: string) => t('data.parse.damaged', { detail });

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
    return { ok: false, reason: t('data.parse.newerVersion') };
  }
  if (
    !Number.isInteger(file.format) ||
    file.format < OLDEST_FORMAT ||
    !Array.isArray(file.expenses) ||
    !Array.isArray(file.categories) ||
    (file.format >= 2 && (!Array.isArray(file.recurrences) || !Array.isArray(file.occurrences)))
  ) {
    return { ok: false, reason: NOT_A_BACKUP };
  }
  if (typeof file.createdAt !== 'string' || Number.isNaN(Date.parse(file.createdAt))) {
    return { ok: false, reason: damaged(t('data.parse.dateUnreadable')) };
  }

  const categories = file.categories.map(parseCategory);
  const badCategories = categories.filter((category) => category === null).length;
  if (badCategories > 0) return { ok: false, reason: damaged(t('data.parse.unreadableCategories', { count: badCategories })) };
  const expenses = file.expenses.map(parseExpense);
  const badExpenses = expenses.filter((expense) => expense === null).length;
  if (badExpenses > 0) return { ok: false, reason: damaged(t('data.parse.unreadableExpenses', { count: badExpenses })) };

  const validCategories = categories as ExpenseCategory[];
  const validExpenses = expenses as Expense[];
  if (hasDuplicates(validCategories.map((c) => c.id)) || hasDuplicates(validExpenses.map((e) => e.id))) {
    return { ok: false, reason: damaged(t('data.parse.duplicates')) };
  }
  const known = new Set([...validCategories, ...BuiltInCategories].map((category) => category.id));
  if (validExpenses.some((expense) => !known.has(expense.categoryId))) {
    return { ok: false, reason: damaged(t('data.parse.missingCategories')) };
  }

  const recurrences = file.format >= 2 ? (file.recurrences as unknown[]).map(parseRecurrence) : [];
  const occurrences = file.format >= 2 ? (file.occurrences as unknown[]).map(parseHandledOccurrence) : [];
  if (recurrences.some((recurrence) => recurrence === null) || occurrences.some((occurrence) => occurrence === null)) {
    return { ok: false, reason: damaged(t('data.parse.unreadableRepeats')) };
  }
  const validRecurrences = recurrences as Recurrence[];
  const validOccurrences = occurrences as HandledOccurrence[];
  const ruleIds = new Set(validRecurrences.map((recurrence) => recurrence.id));
  if (
    hasDuplicates(validRecurrences.map((recurrence) => recurrence.id)) ||
    hasDuplicates(validOccurrences.map((occurrence) => `${occurrence.recurrenceId}:${occurrence.index}`))
  ) {
    return { ok: false, reason: damaged(t('data.parse.duplicates')) };
  }
  if (
    validRecurrences.some((recurrence) => !known.has(recurrence.template.categoryId)) ||
    validOccurrences.some((occurrence) => !ruleIds.has(occurrence.recurrenceId))
  ) {
    return { ok: false, reason: damaged(t('data.parse.unreadableRepeats')) };
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
      recurrences: validRecurrences,
      occurrences: validOccurrences,
      preferences,
    },
  };
}
