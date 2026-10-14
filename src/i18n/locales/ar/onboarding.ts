import type { Translation } from '../../types';
import type { onboarding as english } from '../en/onboarding';

export const onboarding: Translation<typeof english> = {
  'onboarding.title': 'مرحبًا بك في Spendly',
  'onboarding.skip.label': 'تخطي',
  'onboarding.skip.hint': 'يغلق المقدمة',
  'onboarding.step.count': 'الخطوة {step} من {total}',
  'onboarding.step.category.title': 'اضغط على فئة',
  'onboarding.step.category.hint': 'اختر ما أنفقت عليه.',
  'onboarding.step.amount.title': 'حدّد المبلغ',
  'onboarding.step.amount.hint': 'اسحب الرقم لأعلى أو لأسفل، أو استخدم − و+.',
  'onboarding.step.save.title': 'اضغط حفظ',
  'onboarding.step.save.hint': 'هكذا يُسجَّل. التفاصيل مثل الملاحظة اختيارية.',
  'onboarding.done.count': 'تم',
  'onboarding.done.title': 'هذا كل ما في الأمر',
  'onboarding.done.hint': 'كان هذا تدريبًا، لذا لم يُحفظ شيء. مصروفاتك الحقيقية تبقى على هذا الجهاز.',
  'onboarding.done.announcement': 'تم الحفظ. أنت جاهز للبدء.',
  'onboarding.decrease': 'إنقاص المبلغ',
  'onboarding.increase': 'زيادة المبلغ',
  'onboarding.save.label': 'حفظ',
  'onboarding.save.hint': 'حفظ تدريبي لمبلغ {amount}',
  'onboarding.start': 'ابدأ استخدام Spendly',
};
