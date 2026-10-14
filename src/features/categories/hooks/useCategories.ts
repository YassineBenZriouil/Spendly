import { useEffect, useState } from 'react';

import { BuiltInCategories } from '@/domain/category/builtInCategories';
import { categoryRepository } from '@/domain/category/category.repository';
import type { ExpenseCategory } from '@/domain/category/category.types';
import { withDisplayNames } from '@/domain/category/categoryName';

/**
 * Categories from the database, refreshed after every category write.
 * Starts with the built-ins (which are what's seeded) so there's no empty flash.
 * Names are display names (built-ins in the app's language); pass `displayNames: false` for the stored names.
 */
export function useCategories({ displayNames = true } = {}) {
  const [categories, setCategories] = useState<ExpenseCategory[]>(BuiltInCategories);

  useEffect(() => {
    let active = true;
    const refresh = () => {
      categoryRepository
        .list()
        .then((stored) => active && setCategories(stored))
        .catch(() => {
          // Keep what we have: quick capture must keep working even if the read fails
        });
    };
    refresh();
    const unsubscribe = categoryRepository.subscribe(refresh);
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return displayNames ? withDisplayNames(categories) : categories;
}
