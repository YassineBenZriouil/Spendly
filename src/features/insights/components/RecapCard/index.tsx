import * as Sharing from 'expo-sharing';
import { useRef, useState } from 'react';
import { Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { captureRef } from 'react-native-view-shot';

import { fade, useLayoutTransition } from '@/animation/transitions';
import { AnimatedNumber } from '@/components/AnimatedNumber';
import { Button } from '@/components/Button';
import { ErrorBanner } from '@/components/ErrorBanner';
import type { Recap } from '@/domain/insights/recap';
import { formatMoney } from '@/domain/money/money.format';
import { lockStore } from '@/features/lock/state/lockStore';
import { t } from '@/i18n';
import { useTheme } from '@/theme/ThemeProvider';
import { formatFullDay, formatMonth } from '@/utils/dateFormat';

import { styles } from './styles';

type RecapCardProps = {
  recap: Recap;
  categoryName: (categoryId: string) => string;
  /** Shown for the month that just ended, on the current period: it can be put away. */
  onDismiss?: () => void;
};

/**
 * A finished month at a glance: total, where most went, the biggest day, and how it compares with a usual month.
 * Share sends the card (without its buttons) as an image, in the current theme and language.
 */
export function RecapCard({ recap, categoryName, onDismiss }: RecapCardProps) {
  const { colors } = useTheme();
  const layout = useLayoutTransition();
  const card = useRef<View>(null);
  const [shareFailed, setShareFailed] = useState(false);
  const money = (amountMinor: number) => formatMoney(amountMinor, recap.currencyCode);
  const { change } = recap;

  const share = async () => {
    setShareFailed(false);
    try {
      const uri = await captureRef(card, { format: 'png', quality: 1, result: 'tmpfile' });
      // The share sheet is a system screen opened here: coming back from it doesn't lock the app
      await lockStore.withoutLock(() =>
        Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: t('insights.recap.shareTitle') }),
      );
    } catch {
      setShareFailed(true);
    }
  };

  return (
    <Animated.View layout={layout} entering={fade.entering} exiting={fade.exiting} style={styles.wrapper}>
      {/* The part that becomes the shared image: an opaque background, so it looks the same anywhere it lands */}
      <View ref={card} collapsable={false} style={[styles.card, { backgroundColor: colors.surface }]}>
        <Text accessibilityRole="header" style={[styles.title, { color: colors.textSecondary }]}>
          {t('insights.recap.title', { month: formatMonth(recap.month) })}
        </Text>
        <View accessible accessibilityLabel={t('insights.recap.total', { total: money(recap.totalMinor) })}>
          <AnimatedNumber value={recap.totalMinor} currencyCode={recap.currencyCode} size="display" accessible={false} />
        </View>
        <Text style={[styles.line, { color: colors.textPrimary }]}>
          {t('insights.recap.top', { name: categoryName(recap.topCategory.categoryId), amount: money(recap.topCategory.totalMinor) })}
        </Text>
        <Text style={[styles.line, { color: colors.textPrimary }]}>
          {t('insights.recap.biggestDay', { day: formatFullDay(recap.biggestDay.day), amount: money(recap.biggestDay.totalMinor) })}
        </Text>
        {change && (
          <Text style={[styles.line, { color: colors.textPrimary }]}>
            {change.direction === 'same'
              ? t('insights.recap.usual')
              : t(change.direction === 'up' ? 'insights.recap.more' : 'insights.recap.less', { percent: change.percent })}
          </Text>
        )}
        <Text style={[styles.note, { color: colors.textSecondary }]}>{t('common.expenseCount', { count: recap.count })}</Text>
      </View>
      <View style={styles.actions}>
        <Button label={t('insights.recap.share')} variant="secondary" onPress={share} />
        {onDismiss && <Button label={t('insights.recap.dismiss')} variant="secondary" onPress={onDismiss} />}
      </View>
      {shareFailed && <ErrorBanner message={t('insights.recap.shareFailed')} />}
    </Animated.View>
  );
}
