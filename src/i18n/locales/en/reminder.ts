import type { Message } from '../../types';

/** Daily reminder: the notification and its setting. */
export const reminder = {
  'reminder.notification.title': "Anything to log today?",
  'reminder.notification.body': "Add what you spent in two seconds.",
  'reminder.channel': "Daily reminder",
  'reminder.settings.label': "Daily reminder",
  'reminder.settings.caption': "One notification at the time you pick. Skipped on days you already logged something.",
  'reminder.settings.time': "Time",
  'reminder.settings.timeValue': "Reminder time, {time}",
  'reminder.settings.timeHint': "Opens a time picker",
  'reminder.settings.explainTitle': "Allow notifications?",
  'reminder.settings.explainMessage': "Spendly sends one notification a day at the time you pick, only on days you haven't logged anything. Nothing leaves your phone. Your phone will ask you next.",
  'reminder.settings.continue': "Continue",
  'reminder.settings.cancel': "Cancel",
  'reminder.settings.deniedTitle': "Notifications are off",
  'reminder.settings.deniedMessage': "To get the daily reminder, allow notifications for Spendly in Settings.",
  'reminder.settings.openSettings': "Open Settings",
  'reminder.settings.on': "Daily reminder on, at {time}",
  'reminder.settings.off': "Daily reminder off",
} as const satisfies Record<`reminder.${string}`, Message>;
