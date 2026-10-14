import { t, type MessageKey } from '@/i18n';

import { BuiltInCategories } from './builtInCategories';
import type { ExpenseCategory } from './category.types';

const defaultNames = new Map(BuiltInCategories.map((category) => [category.id, category.name]));

/**
 * The name to show: a built-in category still under its original (English, stored) name is shown in the app's
 * language; a renamed or custom category is shown exactly as the user wrote it.
 */
export function categoryDisplayName(category: Pick<ExpenseCategory, 'id' | 'name' | 'isBuiltIn'>): string {
  if (category.isBuiltIn && defaultNames.get(category.id) === category.name) {
    return t(`categories.builtIn.${category.id}` as MessageKey);
  }
  return category.name;
}

/** Categories with display names (for screens and exports, never for storage). */
export function withDisplayNames<T extends Pick<ExpenseCategory, 'id' | 'name' | 'isBuiltIn'>>(categories: T[]): T[] {
  return categories.map((category) => ({ ...category, name: categoryDisplayName(category) }));
}
