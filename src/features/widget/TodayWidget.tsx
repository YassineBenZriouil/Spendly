import { FlexWidget, TextWidget, type HexColor } from 'react-native-android-widget';

import type { CurrencyTotal } from '@/domain/expense/expense.repository';
import { formatMoney } from '@/domain/money/money.format';
import { t } from '@/i18n';
import { NumberFont, NumberSize, Radius, Spacing, Typography, type ThemeColors } from '@/theme/tokens';

/** The Android home-screen widget's name (app.json plugin config). */
export const TODAY_WIDGET = 'Today';
/** Where a tap on the widget goes: Add. */
export const ADD_LINK = 'spendly://add';

const hex = (color: string) => color as HexColor;

/**
 * Today's total per currency, like the Add screen's header; tap opens Add. Widget primitives only: no hooks, no
 * React Native views (the library draws it as native widget views).
 */
export function TodayWidget({ totals, colors }: { totals: CurrencyTotal[]; colors: ThemeColors }) {
  const amounts = totals.map((total) => formatMoney(total.totalMinor, total.currencyCode));
  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: ADD_LINK }}
      accessibilityLabel={t('shortcuts.widget.label', { amounts: amounts.join(', ') || t('shortcuts.widget.nothing') })}
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: Spacing.md,
        borderRadius: Radius.lg,
        backgroundColor: hex(colors.surface),
      }}>
      <TextWidget text={t('shortcuts.widget.title')} style={{ fontSize: Typography.caption.fontSize, color: hex(colors.textSecondary) }} />
      <FlexWidget style={{ flexDirection: 'column' }}>
        {amounts.length > 0 ? (
          amounts.map((amount) => (
            <TextWidget
              key={amount}
              text={amount}
              maxLines={1}
              style={{ fontSize: NumberSize.title, fontFamily: NumberFont.family, color: hex(colors.textPrimary) }}
            />
          ))
        ) : (
          <TextWidget text={t('shortcuts.widget.nothing')} style={{ fontSize: Typography.body.fontSize, color: hex(colors.textSecondary) }} />
        )}
      </FlexWidget>
      <TextWidget text={t('shortcuts.widget.add')} style={{ fontSize: Typography.label.fontSize, color: hex(colors.textPrimary) }} />
    </FlexWidget>
  );
}
