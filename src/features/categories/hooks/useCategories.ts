import { useEffect, useState } from 'react';

import { BuiltInCategories } from '@/domain/category/builtInCategories';
import { categoryRepository } from '@/domain/category/category.repository';
import type { ExpenseCategory } from '@/domain/category/category.types';

/** Categories from the database. Starts with the built-ins (which are what's seeded) so there's no empty flash. */
export function useCategories() {
  const [categories, setCategories] = useState<ExpenseCategory[]>(BuiltInCategories);

  useEffect(() => {
    let active = true;
    categoryRepository
      .list()
      .then((stored) => active && setCategories(stored))
      .catch(() => {
        // Keep the built-ins: quick capture must keep working even if the read fails
      });
    return () => {
      active = false;
    };
  }, []);

  return categories;
}
