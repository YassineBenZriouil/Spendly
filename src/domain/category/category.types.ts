import type { CategoryColorToken } from '@/theme/tokens';

export type CategoryIcon =
  | 'food'
  | 'transport'
  | 'groceries'
  | 'shopping'
  | 'bills'
  | 'health'
  | 'entertainment'
  | 'home'
  | 'travel'
  | 'other';

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
