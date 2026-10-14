import type { ExpenseCategory } from '@/domain/category/category.types';
import type { Expense } from '@/domain/expense/expense.types';
import { currencyExponent } from '@/domain/money/money.format';
import { t } from '@/i18n';

/** Columns, in order. Shown on the export screen so people know what leaves the app. */
export const CsvFields = [
  t('exportCsv.column.date'),
  t('exportCsv.column.time'),
  t('exportCsv.column.amount'),
  t('exportCsv.column.currency'),
  t('exportCsv.column.category'),
  t('exportCsv.column.title'),
  t('exportCsv.column.note'),
  t('exportCsv.column.paymentMethod'),
  t('exportCsv.column.occurredAt'),
];

const pad = (n: number) => String(n).padStart(2, '0');

/** Plain decimal with "." (spreadsheet-friendly, locale-independent): 1250 EUR -> "12.50", 500 JPY -> "500". */
export function minorToDecimal(amountMinor: number, exponent: number): string {
  if (exponent === 0) return String(amountMinor);
  const unit = 10 ** exponent;
  return `${Math.floor(amountMinor / unit)}.${String(amountMinor % unit).padStart(exponent, '0')}`;
}

/**
 * RFC 4180 quoting, plus a guard against spreadsheet formula injection:
 * user text starting with = + - @ (or a tab/CR) is prefixed with ' so it opens as text, not a formula.
 */
function cell(value: string, userText = false): string {
  const safe = userText && /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** CSV of `expenses` (oldest first), dates in the device's local time. UTF-8 BOM so Excel reads accents. */
export function expensesToCsv(expenses: Expense[], categories: ExpenseCategory[]): string {
  const names = new Map(categories.map((category) => [category.id, category.name]));
  const rows = [...expenses]
    .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))
    .map((expense) => {
      const at = new Date(expense.occurredAt);
      return [
        `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`,
        `${pad(at.getHours())}:${pad(at.getMinutes())}`,
        minorToDecimal(expense.amountMinor, currencyExponent(expense.currencyCode)),
        expense.currencyCode,
        cell(names.get(expense.categoryId) ?? expense.categoryId, true),
        cell(expense.title ?? '', true),
        cell(expense.note ?? '', true),
        expense.paymentMethod ?? '',
        expense.occurredAt,
      ].join(',');
    });
  return `﻿${[CsvFields.map((field) => cell(field)).join(','), ...rows].join('\r\n')}\r\n`;
}
