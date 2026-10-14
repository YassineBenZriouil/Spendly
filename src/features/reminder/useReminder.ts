import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { expenseRepository } from '@/domain/expense/expense.repository';

import { syncReminder } from './reminderScheduler';

/**
 * Root layout: keeps the daily reminder scheduled (launch, every write, every return to the app, so a new day or
 * time zone is picked up) and opens Add when the reminder is tapped.
 */
export function useReminder() {
  useEffect(() => {
    syncReminder();
    const unsubscribe = expenseRepository.subscribe(syncReminder);
    const appState = AppState.addEventListener('change', (status) => status === 'active' && syncReminder());
    // A tap while the app is running; at launch the app already opens on Add
    const response = Notifications.addNotificationResponseReceivedListener(() => router.navigate('/'));
    return () => {
      unsubscribe();
      appState.remove();
      response.remove();
    };
  }, []);
}
