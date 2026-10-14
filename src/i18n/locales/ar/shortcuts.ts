import type { Translation } from '../../types';
import type { shortcuts as english } from '../en/shortcuts';

export const shortcuts: Translation<typeof english> = {
  'shortcuts.intro': "سجّل مصروفًا دون المرور بشاشات التطبيق: يفتح Spendly ويحفظه ويعرض التراجع.",
  'shortcuts.quickLog.title': "التسجيل السريع",
  'shortcuts.quickLog.caption': "المصروف الذي يحفظه الاختصار أو مربع الإعدادات السريعة، بعملتك.",
  'shortcuts.quickLog.current': "الآن: {amount}، {category}",
  'shortcuts.quickLog.none': "لم يتم الإعداد بعد.",
  'shortcuts.quickLog.amount': "المبلغ ({currency})",
  'shortcuts.quickLog.invalid': "أدخل مبلغًا أكبر من صفر واختر فئة.",
  'shortcuts.quickLog.save': "حفظ التسجيل السريع",
  'shortcuts.quickLog.remove': "إزالة",
  'shortcuts.quickLog.saved': "التسجيل السريع: {amount}، {category}",
  'shortcuts.quickLog.removed': "تمت إزالة التسجيل السريع",
  'shortcuts.links.title': "الروابط",
  'shortcuts.links.ios': "في تطبيق الاختصارات: اختصار جديد ← فتح عناوين URL ← الصق الرابط. سمِّه (مثلًا \"سجّل قهوة\") وقل هذا الاسم لـ Siri.",
  'shortcuts.links.android': "يمكن لأي تطبيق أو مشغّل يفتح الروابط استخدامها، مثلًا كاختصار على الشاشة الرئيسية.",
  'shortcuts.links.shareQuick': "مشاركة رابط التسجيل السريع",
  'shortcuts.links.example': "أو أي مبلغ وفئة، بالإنجليزية أو العربية:",
  'shortcuts.links.shareExample': "مشاركة رابط المثال",
  'shortcuts.android.title': "على الشاشة الرئيسية",
  'shortcuts.android.widget': "الأداة: اضغط مطولًا على الشاشة الرئيسية ← الأدوات ← Spendly. تعرض مجموع اليوم؛ اضغطها للإضافة.",
  'shortcuts.android.tile': "مربع الإعدادات السريعة: اسحب للأسفل مرتين ← تعديل ← اسحب \"تسجيل سريع\". نقرة واحدة تحفظ تسجيلك السريع.",
  'shortcuts.widget.title': "اليوم",
  'shortcuts.widget.nothing': "لا شيء بعد",
  'shortcuts.widget.add': "إضافة",
  'shortcuts.widget.label': "Spendly، اليوم: {amounts}. يفتح الإضافة.",
};
