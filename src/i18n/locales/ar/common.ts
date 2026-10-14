import type { Translation } from '../../types';
import type { common as english } from '../en/common';

export const common: Translation<typeof english> = {
  'common.tab.add': 'إضافة',
  'common.tab.activity': 'النشاط',
  'common.tab.insights': 'الإحصاءات',
  'common.screen.settings': 'الإعدادات',
  'common.screen.currency': 'العملة',
  'common.screen.budget': "الميزانية",
  'common.screen.export': 'تصدير',
  'common.screen.categories': 'الفئات',
  'common.screen.category': 'الفئة',
  'common.screen.expense': 'المصروف',
  'common.expenseCount': {
    zero: '{count} مصروف',
    one: '{count} مصروف',
    two: '{count} مصروفان',
    few: '{count} مصروفات',
    many: '{count} مصروفًا',
    other: '{count} مصروف',
  },
  'common.categoryCount': {
    zero: '{count} فئة',
    one: '{count} فئة',
    two: '{count} فئتان',
    few: '{count} فئات',
    many: '{count} فئة',
    other: '{count} فئة',
  },
  'common.cancel': 'إلغاء',
  'common.clear': 'مسح',
  'common.error.nothingChanged': 'لم يتغيّر شيء. حاول مرة أخرى.',
  'common.screen.shortcuts': "الاختصارات",
};
