import type { Translation } from '../../types';
import type { reminder as english } from '../en/reminder';

export const reminder: Translation<typeof english> = {
  'reminder.notification.title': "هل من شيء لتسجيله اليوم؟",
  'reminder.notification.body': "أضف ما أنفقته في ثانيتين.",
  'reminder.channel': "التذكير اليومي",
  'reminder.settings.label': "التذكير اليومي",
  'reminder.settings.caption': "إشعار واحد في الوقت الذي تختاره. لا يُرسل في الأيام التي سجّلت فيها شيئًا.",
  'reminder.settings.time': "الوقت",
  'reminder.settings.timeValue': "وقت التذكير، {time}",
  'reminder.settings.timeHint': "يفتح منتقي الوقت",
  'reminder.settings.explainTitle': "السماح بالإشعارات؟",
  'reminder.settings.explainMessage': "يرسل Spendly إشعارًا واحدًا في اليوم في الوقت الذي تختاره، فقط في الأيام التي لم تسجّل فيها شيئًا. لا يغادر أي شيء هاتفك. سيسألك هاتفك بعد ذلك.",
  'reminder.settings.continue': "متابعة",
  'reminder.settings.cancel': "إلغاء",
  'reminder.settings.deniedTitle': "الإشعارات متوقفة",
  'reminder.settings.deniedMessage': "لتلقي التذكير اليومي، اسمح بإشعارات Spendly من الإعدادات.",
  'reminder.settings.openSettings': "فتح الإعدادات",
  'reminder.settings.on': "التذكير اليومي مُفعّل، في {time}",
  'reminder.settings.off': "التذكير اليومي متوقف",
};
