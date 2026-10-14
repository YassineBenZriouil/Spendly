import type { Message } from '../../types';

/** Shared across screens: navigation titles and words used in several places. */
export const common = {
  'common.tab.add': 'Add',
  'common.tab.activity': 'Activity',
  'common.tab.insights': 'Insights',
  'common.screen.settings': 'Settings',
  'common.screen.currency': 'Currency',
  'common.screen.export': 'Export',
  'common.screen.categories': 'Categories',
  'common.screen.category': 'Category',
  'common.screen.expense': 'Expense',
  'common.expenseCount': { one: '{count} expense', other: '{count} expenses' },
  'common.categoryCount': { one: '{count} category', other: '{count} categories' },
  'common.cancel': 'Cancel',
  'common.clear': 'Clear',
  'common.error.nothingChanged': 'Nothing was changed. Try again.',
} as const satisfies Record<`common.${string}`, Message>;
