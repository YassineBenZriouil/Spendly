import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

import type { ExpenseCategory } from '@/domain/category/category.types';
import { expenseRepository } from '@/domain/expense/expense.repository';
import { createExpense } from '@/domain/expense/expense.service';
import { parseAddLink, type AddLinkParams, type AddLinkResult } from '@/domain/links/addLink';
import { formatMoney } from '@/domain/money/money.format';
import { undoStore } from '@/features/undo/state/undoStore';
import { haptics } from '@/haptics/haptics.service';
import { t, type MessageKey } from '@/i18n';
import { writeFailureMessage } from '@/storage/database/errors';
import { getPreferences } from '@/storage/preferences/preferences';

import type { QuickAddEvent } from '../state/quickAddReducer';

const CLEARED = { link: undefined, amount: undefined, currency: undefined, category: undefined, save: undefined, quick: undefined };
/** How long a link's notice stays. */
const MESSAGE_MS = 6000;

/**
 * Handles `spendly://add` links (forwarded by the `/add` route with a `link` nonce, so the same link works twice):
 * with `save`, the expense is saved at once (Undo, a buzz, spoken, like a save from the screen); otherwise Add is
 * pre-filled. Returns a message when the link couldn't be used as asked.
 */
export function useAddLink({
  categories,
  loaded,
  currencyCode,
  dispatch,
}: {
  categories: ExpenseCategory[];
  /** The stored categories are known (custom names can only be matched then). */
  loaded: boolean;
  currencyCode: string;
  dispatch: (event: QuickAddEvent) => void;
}): string | null {
  const params = useLocalSearchParams<AddLinkParams & { link?: string }>();
  const nonce = typeof params.link === 'string' ? params.link : undefined;

  // Read once per link, while rendering (it is pure); the effect below acts on it
  const [link, setLink] = useState<{ nonce: string; result: AddLinkResult } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  if (nonce && loaded && link?.nonce !== nonce) {
    const result = parseAddLink(params, { categories, defaultCurrency: currencyCode, quickLog: getPreferences().quickLog });
    setLink({ nonce, result });
    setMessage(result.problem ? t(`quickAdd.link.problem.${result.problem}` as MessageKey) : null);
  }

  useEffect(() => {
    if (!link) return;
    router.setParams(CLEARED);
    const { request } = link.result;
    const category = categories.find((item) => item.id === request.categoryId);
    if (request.save && request.amountMinor !== undefined && category) {
      const expense = createExpense({ amountMinor: request.amountMinor, currencyCode: request.currencyCode, categoryId: category.id });
      expenseRepository
        .save(expense)
        .then(() => {
          undoStore.offer('saved', expense);
          haptics.success();
          AccessibilityInfo.announceForAccessibility(
            t('quickAdd.link.saved', { amount: formatMoney(expense.amountMinor, expense.currencyCode), category: category.name }),
          );
        })
        .catch((error) => setMessage(writeFailureMessage(error, t('quickAdd.save.failed'))));
      return;
    }
    // Pre-fill what the link had; an amount in another currency than the app's can only be saved directly
    if (category) dispatch({ type: 'selectCategory', categoryId: category.id });
    if (request.amountMinor !== undefined && request.currencyCode === currencyCode) {
      dispatch({ type: 'amountChanged', amountMinor: request.amountMinor });
    }
    // Once per link: not when categories or the currency change later
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [link]);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), MESSAGE_MS);
    return () => clearTimeout(timer);
  }, [message]);

  return message;
}
