import { useEffect } from 'react';
import { AppState } from 'react-native';

import { expenseRepository } from '@/domain/expense/expense.repository';

import { updateTodayWidget } from './widgetTasks';

/** Root layout: redraws the Android widget after every write (save, undo, edit, delete) and when the app comes back. */
export function useWidgetSync() {
  useEffect(() => {
    updateTodayWidget();
    const unsubscribe = expenseRepository.subscribe(updateTodayWidget);
    const appState = AppState.addEventListener('change', (status) => status === 'active' && updateTodayWidget());
    return () => {
      unsubscribe();
      appState.remove();
    };
  }, []);
}
