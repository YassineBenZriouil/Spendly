import type { ExpenseCategory } from './category.types';

const createdAt = '2026-01-01T00:00:00.000Z';

const builtIn = (
  id: ExpenseCategory['icon'],
  name: string,
  colorToken: ExpenseCategory['colorToken'],
  sortOrder: number,
): ExpenseCategory => ({ id, name, icon: id, colorToken, isBuiltIn: true, isVisible: true, sortOrder, createdAt });

/** Seed categories. IDs are stable forever: expenses reference them. */
export const BuiltInCategories: ExpenseCategory[] = [
  builtIn('food', 'Food', 'coral', 0),
  builtIn('transport', 'Transport', 'blue', 1),
  builtIn('groceries', 'Groceries', 'green', 2),
  builtIn('shopping', 'Shopping', 'violet', 3),
  builtIn('bills', 'Bills', 'amber', 4),
  builtIn('health', 'Health', 'teal', 5),
  builtIn('entertainment', 'Entertainment', 'pink', 6),
  builtIn('home', 'Home', 'slate', 7),
  builtIn('travel', 'Travel', 'sky', 8),
  builtIn('other', 'Other', 'neutral', 9),
];
