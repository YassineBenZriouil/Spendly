import type { Translation } from '../../types';
import type { exportCsv as english } from '../en/exportCsv';

export const exportCsv: Translation<typeof english> = {
  'exportCsv.range.label': 'نطاق التاريخ',
  'exportCsv.range.month': 'هذا الشهر',
  'exportCsv.range.quarter': 'آخر ثلاثة أشهر',
  'exportCsv.range.year': 'هذه السنة',
  'exportCsv.range.all': 'منذ البداية',
  'exportCsv.range.from': 'من {date} حتى اليوم.',
  'exportCsv.count.none': 'لا مصروفات في هذا النطاق',
  'exportCsv.count.willExport': {
    zero: 'سيتم تصدير {count} مصروف',
    one: 'سيتم تصدير {count} مصروف',
    two: 'سيتم تصدير {count} مصروفين',
    few: 'سيتم تصدير {count} مصروفات',
    many: 'سيتم تصدير {count} مصروفًا',
    other: 'سيتم تصدير {count} مصروف',
  },
  'exportCsv.fields.title': 'الحقول المضمّنة',
  'exportCsv.fields.note':
    'تستخدم المبالغ النقطة فاصلًا عشريًا، والتواريخ والأوقات بالمنطقة الزمنية لهذا الجهاز. يحتفظ كل مصروف بعملته.',
  'exportCsv.destination.title': 'إلى أين يذهب',
  'exportCsv.destination.note':
    'ينشئ Spendly ملف CSV على هذا الجهاز ويفتح قائمة المشاركة. لا يذهب الملف إلا إلى حيث ترسله، مثل تطبيق الملفات أو البريد الإلكتروني أو تطبيق جداول بيانات. لا يرفع Spendly أي شيء.',
  'exportCsv.shareTitle': 'تصدير المصروفات',
  'exportCsv.success': {
    zero: 'تم تصدير {count} مصروف.',
    one: 'تم تصدير {count} مصروف.',
    two: 'تم تصدير {count} مصروفين.',
    few: 'تم تصدير {count} مصروفات.',
    many: 'تم تصدير {count} مصروفًا.',
    other: 'تم تصدير {count} مصروف.',
  },
  'exportCsv.error': 'تعذّر التصدير. لم تتم مشاركة أي شيء؛ حاول مرة أخرى.',
  'exportCsv.button': 'تصدير CSV',

  'exportCsv.column.date': 'التاريخ',
  'exportCsv.column.time': 'الوقت',
  'exportCsv.column.amount': 'المبلغ',
  'exportCsv.column.currency': 'العملة',
  'exportCsv.column.category': 'الفئة',
  'exportCsv.column.title': 'العنوان',
  'exportCsv.column.note': 'ملاحظة',
  'exportCsv.column.paymentMethod': 'طريقة الدفع',
  'exportCsv.column.occurredAt': 'وقت الحدوث (UTC)',
  'exportCsv.column.type': "النوع",
  'exportCsv.type.expense': "مصروف",
  'exportCsv.type.income': "دخل",
};
