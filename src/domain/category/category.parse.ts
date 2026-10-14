import { CategoryColors, type CategoryColorToken } from '@/theme/tokens';

import { validateCategoryName } from './category.service';
import { CategoryIcons, type CategoryIcon, type ExpenseCategory } from './category.types';

/** An `ExpenseCategory` read back from outside the database (a backup file), or `null` if anything about it is wrong. */
export function parseCategory(value: unknown): ExpenseCategory | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  const valid =
    typeof v.id === 'string' &&
    v.id.length > 0 &&
    typeof v.name === 'string' &&
    validateCategoryName(v.name) === null &&
    CategoryIcons.includes(v.icon as CategoryIcon) &&
    typeof v.colorToken === 'string' &&
    v.colorToken in CategoryColors.light &&
    typeof v.isBuiltIn === 'boolean' &&
    typeof v.isVisible === 'boolean' &&
    typeof v.sortOrder === 'number' &&
    Number.isInteger(v.sortOrder) &&
    typeof v.createdAt === 'string' &&
    !Number.isNaN(Date.parse(v.createdAt));
  if (!valid) return null;
  return {
    id: v.id as string,
    name: (v.name as string).trim(),
    icon: v.icon as CategoryIcon,
    colorToken: v.colorToken as CategoryColorToken,
    isBuiltIn: v.isBuiltIn as boolean,
    isVisible: v.isVisible as boolean,
    sortOrder: v.sortOrder as number,
    createdAt: v.createdAt as string,
  };
}
