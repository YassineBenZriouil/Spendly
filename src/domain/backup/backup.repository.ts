import { categoryParams, INSERT_CATEGORY_SQL } from '@/domain/category/category.repository';
import { expenseParams, INSERT_EXPENSE_SQL } from '@/domain/expense/expense.repository';
import {
  INSERT_OCCURRENCE_SQL,
  INSERT_RECURRENCE_SQL,
  occurrenceParams,
  recurrenceParams,
} from '@/domain/recurrence/recurrence.repository';
import type { Db } from '@/storage/database/db.types';

import type { Backup } from './backup';

export type RestoreResult = {
  expensesAdded: number;
  expensesAlreadyHere: number;
  categoriesAdded: number;
  categoriesAlreadyHere: number;
};

/**
 * Merges a (validated) backup into the database in one transaction: records whose id is already here are left exactly
 * as they are, so nothing on this phone is overwritten and restoring the same file twice adds nothing the second time.
 * If anything fails, nothing is written.
 */
export async function restoreBackup(db: Db, backup: Backup): Promise<RestoreResult> {
  const result: RestoreResult = { expensesAdded: 0, expensesAlreadyHere: 0, categoriesAdded: 0, categoriesAlreadyHere: 0 };
  await db.withExclusiveTransactionAsync(async (txn) => {
    // Categories first: expenses reference them
    for (const category of backup.categories) {
      const { changes } = await txn.runAsync(INSERT_CATEGORY_SQL, categoryParams(category));
      if (changes > 0) result.categoriesAdded += 1;
      else result.categoriesAlreadyHere += 1;
    }
    for (const expense of backup.expenses) {
      const { changes } = await txn.runAsync(INSERT_EXPENSE_SQL, expenseParams(expense));
      if (changes > 0) result.expensesAdded += 1;
      else result.expensesAlreadyHere += 1;
    }
    // Rules before their occurrences; both skip what is already here, like everything else
    for (const recurrence of backup.recurrences) await txn.runAsync(INSERT_RECURRENCE_SQL, recurrenceParams(recurrence));
    for (const occurrence of backup.occurrences) await txn.runAsync(INSERT_OCCURRENCE_SQL, occurrenceParams(occurrence));
  });
  return result;
}
