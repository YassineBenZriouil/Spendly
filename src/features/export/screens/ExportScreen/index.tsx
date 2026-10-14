import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { fade, useEnterTransition } from '@/animation/transitions';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { OptionGroup } from '@/components/OptionGroup';
import { Screen } from '@/components/Screen';
import { categoryRepository } from '@/domain/category/category.repository';
import { withDisplayNames } from '@/domain/category/categoryName';
import { expenseRepository } from '@/domain/expense/expense.repository';
import { CsvFields, expensesToCsv } from '@/domain/export/csv';
import { t } from '@/i18n';
import { useTheme } from '@/theme/ThemeProvider';
import { addLocalMonths, startOfLocalMonth, type IsoRange } from '@/utils/dates';
import { formatDay } from '@/utils/dateFormat';
import { EdgeToEdge } from '@/theme/tokens';
import { lockStore } from '@/features/lock/state/lockStore';

import { styles } from './styles';

type RangeKey = 'month' | 'quarter' | 'year' | 'all';

const RANGES: { value: RangeKey; label: string }[] = [
  { value: 'month', label: t('exportCsv.range.month') },
  { value: 'quarter', label: t('exportCsv.range.quarter') },
  { value: 'year', label: t('exportCsv.range.year') },
  { value: 'all', label: t('exportCsv.range.all') },
];

/** Half-open ISO ranges compare as strings in SQL; "all" spans every possible timestamp. */
function rangeFor(key: RangeKey, now = new Date()): IsoRange {
  const end = '9999-12-31T23:59:59.999Z';
  if (key === 'all') return { start: '0000-01-01T00:00:00.000Z', end };
  const start =
    key === 'month'
      ? startOfLocalMonth(now)
      : key === 'quarter'
        ? addLocalMonths(now, -2)
        : new Date(now.getFullYear(), 0, 1);
  return { start: start.toISOString(), end };
}

/** CSV export: pick a range, see what's included, write the file and hand it to the share sheet. */
export function ExportScreen() {
  const { colors } = useTheme();
  const entering = useEnterTransition();
  const [range, setRange] = useState<RangeKey>('month');
  const [count, setCount] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);

  useEffect(() => {
    let active = true;
    expenseRepository
      .listBetween(rangeFor(range))
      .then((expenses) => active && setCount(expenses.length))
      .catch(() => active && setCount(null));
    return () => {
      active = false;
    };
  }, [range]);

  const exportCsv = async () => {
    setBusy(true);
    setMessage(null);
    try {
      if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device');
      const [expenses, categories] = await Promise.all([
        expenseRepository.listBetween(rangeFor(range)),
        categoryRepository.list(),
      ]);
      // Cache directory: the system may clear it later; the shared copy is wherever the user sends it
      const file = new File(Paths.cache, `spendly-${new Date().toISOString().slice(0, 10)}.csv`);
      file.create({ overwrite: true });
      file.write(expensesToCsv(expenses, withDisplayNames(categories)));
      // The share sheet is a system screen opened here: coming back from it doesn't lock the app
      await lockStore.withoutLock(() =>
        Sharing.shareAsync(file.uri, {
          mimeType: 'text/csv',
          UTI: 'public.comma-separated-values-text',
          dialogTitle: t('exportCsv.shareTitle'),
        }),
      );
      setMessage({ error: false, text: t('exportCsv.success', { count: expenses.length }) });
    } catch {
      setMessage({ error: true, text: t('exportCsv.error') });
    } finally {
      setBusy(false);
    }
  };

  const countLabel =
    count === null ? ' ' : count === 0 ? t('exportCsv.count.none') : t('exportCsv.count.willExport', { count });

  return (
    <Screen edges={['bottom']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={EdgeToEdge.scroll}
        contentContainerStyle={[styles.content, EdgeToEdge.content]}>
        <Animated.View entering={entering} style={styles.sections}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t('exportCsv.range.label')}</Text>
          <OptionGroup<RangeKey> accessibilityLabel={t('exportCsv.range.label')} options={RANGES} value={range} onChange={setRange} />
          <View style={styles.countSlot} accessibilityLiveRegion="polite">
            <Animated.Text key={countLabel} {...fade} style={[styles.body, styles.countText, { color: colors.textPrimary }]}>
              {countLabel}
            </Animated.Text>
          </View>
          {range !== 'all' && (
            <Animated.Text {...fade} style={[styles.note, { color: colors.textSecondary }]}>
              {t('exportCsv.range.from', { date: formatDay(new Date(rangeFor(range).start)) })}
            </Animated.Text>
          )}

          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t('exportCsv.fields.title')}</Text>
          <Text style={[styles.body, { color: colors.textPrimary }]}>{CsvFields.join(', ')}</Text>
          <Text style={[styles.note, { color: colors.textSecondary }]}>
            {t('exportCsv.fields.note')}
          </Text>

          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t('exportCsv.destination.title')}</Text>
          <Text style={[styles.note, { color: colors.textSecondary }]}>
            {t('exportCsv.destination.note')}
          </Text>

          {message && (
            <Animated.View
              key={message.text}
              {...fade}
              accessibilityLiveRegion="polite"
              style={[styles.message, { backgroundColor: colors.surfaceSecondary }]}>
              <Icon name={message.error ? 'error' : 'check'} color={message.error ? colors.danger : colors.success} size={18} />
              <Text style={[styles.messageText, { color: colors.textPrimary }]}>{message.text}</Text>
            </Animated.View>
          )}

          <Button label={t('exportCsv.button')} disabled={busy || count === 0} onPress={exportCsv} />
        </Animated.View>
      </ScrollView>
    </Screen>
  );
}
