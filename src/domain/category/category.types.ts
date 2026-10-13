import type { CategoryColorToken } from '@/theme/tokens';

/** Icons a category can use (built-ins first). Keys must exist in the `Icon` component's map. */
export const CategoryIcons = [
  'food',
  'transport',
  'groceries',
  'shopping',
  'bills',
  'health',
  'entertainment',
  'home',
  'travel',
  'other',
  'coffee',
  'gift',
  'pets',
  'education',
  'fitness',
  'fuel',
  'phone',
  'beauty',
  'savings',
  'music',
  'work',
] as const;

export type CategoryIcon = (typeof CategoryIcons)[number];

export type ExpenseCategory = {
  id: string;
  name: string;
  /** Stable icon key, not a rendered component. */
  icon: CategoryIcon;
  colorToken: CategoryColorToken;
  isBuiltIn: boolean;
  isVisible: boolean;
  sortOrder: number;
  createdAt: string;
};
