import { useEffect, useState } from 'react';

import { BuiltInCategories } from '@/domain/category/builtInCategories';
import { categoryRepository } from '@/domain/category/category.repository';
import type { ExpenseCategory } from '@/domain/category/category.types';
import { withDisplayNames } from '@/domain/category/categoryName';

/** The last list read from the database, so screens opened later start with the real order. */
let lastLoaded: ExpenseCategory[] | null = null;

/**
 * Categories from the database, refreshed after every category write. `loaded` is false until the stored list
 * (with the user's order and hidden categories) has been read once; until then `categories` are the built-ins.
 * Names are display names (built-ins in the app's language); pass `displayNames: false` for the stored names.
 */
export function useCategoryList({ displayNames = true } = {}) {
  const [stored, setStored] = useState<ExpenseCategory[] | null>(lastLoaded);

  useEffect(() => {
    let active = true;
    const refresh = () => {
      categoryRepository
        .list()
        .then((list) => {
          lastLoaded = list;
          if (active) setStored(list);
        })
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

  const categories = stored ?? BuiltInCategories;
  return { categories: displayNames ? withDisplayNames(categories) : categories, loaded: stored !== null };
}

/** Categories (built-ins until the stored list arrives, so there's no empty flash). See `useCategoryList`. */
export function useCategories(options?: { displayNames?: boolean }) {
  return useCategoryList(options).categories;
}
