import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { expenseRepository } from '@/domain/expense/expense.repository';
import { reminderDates } from '@/domain/reminder/reminder';
import { t } from '@/i18n';
import { getPreferences } from '@/storage/preferences/preferences';

const CHANNEL_ID = 'daily-reminder';

/**
 * Replaces the scheduled reminders with the next ones (`reminderDates`): none today once something was logged today.
 * Local notifications only, and the reminder is the app's only notification, so clearing all of them is safe.
 * Calls are queued, so a save and a return to the app at the same moment can't interleave.
 */
let queue: Promise<void> = Promise.resolve();
export function syncReminder(): Promise<void> {
  queue = queue.then(schedule).catch(() => {
    // Best effort: the next launch, return to the app or save tries again
  });
  return queue;
}

async function schedule() {
  await Notifications.cancelAllScheduledNotificationsAsync();
  const { reminder } = getPreferences();
  if (!reminder || !(await Notifications.getPermissionsAsync()).granted) return;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: t('reminder.channel'),
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const lastLoggedAt = await expenseRepository.lastLoggedAt();
  for (const date of reminderDates(reminder, new Date(), lastLoggedAt ? new Date(lastLoggedAt) : null)) {
    await Notifications.scheduleNotificationAsync({
      content: { title: t('reminder.notification.title'), body: t('reminder.notification.body') },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId: CHANNEL_ID },
    });
  }
}
