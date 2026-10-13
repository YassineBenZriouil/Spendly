import type { CategoryColorToken } from '@/theme/tokens';
import { createId } from '@/utils/ids';

import type { CategoryIcon, ExpenseCategory } from './category.types';

export const MAX_CATEGORY_NAME_LENGTH = 24;

export type CategoryInput = { name: string; icon: CategoryIcon; colorToken: CategoryColorToken };

export function validateCategoryName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return 'Name is required';
  if (trimmed.length > MAX_CATEGORY_NAME_LENGTH) return `Name must be ${MAX_CATEGORY_NAME_LENGTH} characters or fewer`;
  return null;
}

/** A user-made category, placed after all existing ones. */
export function createCategory(input: CategoryInput, sortOrder: number, now = new Date()): ExpenseCategory {
  const error = validateCategoryName(input.name);
  if (error) throw new Error(error);
  return {
    id: createId(),
    name: input.name.trim(),
    icon: input.icon,
    colorToken: input.colorToken,
    isBuiltIn: false,
    isVisible: true,
    sortOrder,
    createdAt: now.toISOString(),
  };
}

/** Rename / restyle. The id is kept, so every expense in this category follows the change. */
export function editCategory(existing: ExpenseCategory, input: CategoryInput): ExpenseCategory {
  const error = validateCategoryName(input.name);
  if (error) throw new Error(error);
  return { ...existing, name: input.name.trim(), icon: input.icon, colorToken: input.colorToken };
}

/** Swaps a category with its neighbour; returns the new id order, or null at the edges. */
export function moveCategory(ids: string[], id: string, direction: -1 | 1): string[] | null {
  const from = ids.indexOf(id);
  const to = from + direction;
  if (from === -1 || to < 0 || to >= ids.length) return null;
  const next = [...ids];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}
