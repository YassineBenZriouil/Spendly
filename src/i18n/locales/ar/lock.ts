import type { Translation } from '../../types';
import type { lock as english } from '../en/lock';

export const lock: Translation<typeof english> = {
  'lock.title': "Spendly مقفل",
  'lock.unlock': "فتح القفل",
  'lock.prompt': "افتح قفل Spendly",
  'lock.cancel': "إلغاء",
  'lock.failed': "تعذّر فتح القفل. حاول مرة أخرى.",
  'lock.unlocked': "تم فتح القفل",
  'lock.turnedOffTitle': "تم إيقاف قفل التطبيق",
  'lock.turnedOffMessage': "لم يعد لهذا الهاتف رمز مرور أو بصمة وجه أو إصبع، لذا لا يستطيع Spendly التحقق من هويتك. أعد تشغيل قفل التطبيق بعد إعداد أحدها.",
  'lock.settings.label': "قفل التطبيق",
  'lock.settings.caption': "بصمة الوجه أو الإصبع أو رمز مرور هاتفك. يُقفل التطبيق عند مغادرته ويخفيه في مبدّل التطبيقات.",
  'lock.settings.enablePrompt': "تشغيل قفل التطبيق",
  'lock.settings.noPasscodeTitle': "عيّن رمز مرور أولاً",
  'lock.settings.noPasscodeMessage': "يستخدم قفل التطبيق رمز مرور هاتفك أو بصمة الوجه أو الإصبع. أعدّ أحدها من إعدادات هاتفك ثم حاول مرة أخرى.",
  'lock.settings.grace': "القفل",
  'lock.settings.immediately': "فورًا",
  'lock.settings.oneMinute': "بعد دقيقة واحدة",
  'lock.settings.on': "قفل التطبيق مُفعّل",
  'lock.settings.off': "قفل التطبيق متوقف",
};
