import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useReducedMotion } from '@/animation/reducedMotion';
import { ReducedTiming } from '@/animation/tokens';
import { fade, settleTo } from '@/animation/transitions';
import { AnimatedNumber } from '@/components/AnimatedNumber';
import type { Insights } from '@/domain/insights/insights.service';
import type { PeriodKind } from '@/domain/insights/period';
import { deviceLocale, formatMoney } from '@/domain/money/money.format';
import { t } from '@/i18n';
import { useTheme } from '@/theme/ThemeProvider';
import { FontScaleCap } from '@/theme/tokens';
import { formatDay } from '@/utils/dateFormat';

import { PLOT_HEIGHT, styles } from './styles';

type Day = Insights['days'][number];

type TrendChartProps = {
  days: Day[];
  kind: PeriodKind;
  currencyCode: string;
  /** Index of today in `days` (current period only): drawn hatched in Black & White, as the day isn't over. */
  todayIndex: number;
};

/** Bars never fill their slot: capped at 24pt, with at least a 2pt surface gap between neighbours. */
const MAX_BAR = 24;
const GAP = 2;
/** A zero day is a visible stub on the baseline; "no data" is a hollow ring instead. */
const ZERO_STUB = 2;
/** Stripes cover the tallest bar plus its width, every HATCH_GAP points. */
const HATCH_GAP = 5;
const HATCH_LINES = Math.ceil((PLOT_HEIGHT * 2 + MAX_BAR) / HATCH_GAP);

/** Daily spending for the period: one series, one color. Tap a bar for its value. */
export function TrendChart({ days, kind, currencyCode, todayIndex }: TrendChartProps) {
  const { colors, style } = useTheme();
  const hatchToday = style === 'mono' && todayIndex >= 0;
  const [plotWidth, setPlotWidth] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);

  const max = Math.max(0, ...days.map((d) => d.totalMinor));
  const slot = days.length > 0 ? plotWidth / days.length : 0;
  const barWidth = Math.max(2, Math.min(MAX_BAR, slot - GAP));
  const selectedDay = selected !== null ? days[selected] : undefined;
  const weekday = new Intl.DateTimeFormat(deviceLocale(), { weekday: 'narrow' });

  const describe = (day: Day) =>
    day.state === 'spent'
      ? formatMoney(day.totalMinor, currencyCode)
      : day.state === 'zero'
        ? t('insights.chart.nothingSpent')
        : t('insights.chart.noData');

  const readout = selectedDay
    ? t('insights.chart.readout', { label: formatDay(selectedDay.day), value: describe(selectedDay) })
    : max > 0
      ? t('insights.chart.readout', { label: t('insights.chart.highestDay'), value: formatMoney(max, currencyCode) })
      : t('insights.chart.noSpendingYet');
  // Shown as a label that cross-fades plus an amount that rolls from one day to the next
  const readoutLabel = selectedDay ? formatDay(selectedDay.day) : max > 0 ? t('insights.chart.highestDay') : readout;
  const readoutAmount = selectedDay ? (selectedDay.state === 'spent' ? selectedDay.totalMinor : null) : max > 0 ? max : null;
  const readoutNote = selectedDay && selectedDay.state !== 'spent' ? describe(selectedDay) : null;

  return (
    <View style={styles.chart}>
      <View style={styles.readoutSlot} accessible accessibilityLabel={readout} accessibilityLiveRegion="polite">
        <Animated.Text key={readoutLabel} {...fade} numberOfLines={1} style={[styles.readout, { color: colors.textPrimary }]}>
          {readoutAmount !== null || readoutNote ? t('insights.chart.readoutPrefix', { label: readoutLabel }) : readoutLabel}
        </Animated.Text>
        {readoutAmount !== null && (
          <Animated.View {...fade}>
            <AnimatedNumber value={readoutAmount} currencyCode={currencyCode} size="label" accessible={false} />
          </Animated.View>
        )}
        {readoutNote && (
          <Animated.Text key={readoutNote} {...fade} style={[styles.readout, { color: colors.textPrimary }]}>
            {readoutNote}
          </Animated.Text>
        )}
      </View>

      <View style={styles.plot} onLayout={(e) => setPlotWidth(e.nativeEvent.layout.width)}>
        {/* Recessive hairlines: the max gridline and the baseline */}
        <View style={[styles.gridTop, { backgroundColor: colors.borderSubtle }]} />
        <View style={[styles.baseline, { backgroundColor: colors.borderSubtle }]} />
        <View style={styles.bars}>
          {days.map((day, index) => (
            <TrendBar
              key={index}
              day={day}
              height={day.state === 'spent' && max > 0 ? Math.max(ZERO_STUB, (day.totalMinor / max) * PLOT_HEIGHT) : 0}
              width={barWidth}
              dimmed={selected !== null && selected !== index}
              selected={selected === index}
              hatched={hatchToday && index === todayIndex}
              accessibilityLabel={t('insights.chart.barLabel', { day: formatDay(day.day), value: describe(day) })}
              onPress={() => setSelected(selected === index ? null : index)}
            />
          ))}
        </View>
      </View>

      <View style={styles.labels}>
        {days.map((day, index) => (
          <Text maxFontSizeMultiplier={FontScaleCap.control} key={index} style={[styles.label, { color: colors.textSecondary }]}>
            {kind === 'week' ? weekday.format(day.day) : [1, 8, 15, 22, 29].includes(day.day.getDate()) ? day.day.getDate() : ''}
          </Text>
        ))}
      </View>

      <View style={styles.legend} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <LegendItem label={t('insights.chart.spent')}>
          <View style={[styles.keyBar, { backgroundColor: colors.chart }]} />
        </LegendItem>
        <LegendItem label={t('insights.chart.nothingSpent')}>
          <View style={[styles.keyStub, { backgroundColor: colors.chart }]} />
        </LegendItem>
        {hatchToday && (
          <LegendItem label={t('insights.chart.today')}>
            <View style={[styles.keyBar, styles.hatched, { borderColor: colors.chart }]}>
              <Hatch color={colors.chart} />
            </View>
          </LegendItem>
        )}
        <LegendItem label={t('insights.chart.noData')}>
          <View style={[styles.keyRing, { borderColor: colors.textSecondary }]} />
        </LegendItem>
      </View>
    </View>
  );
}

function LegendItem({ label, children }: { label: string; children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={styles.legendItem}>
      {children}
      <Text style={[styles.legendLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

type TrendBarProps = {
  day: Day;
  height: number;
  width: number;
  dimmed: boolean;
  selected: boolean;
  /** Today in Black & White: outlined with diagonal stripes instead of a solid fill. */
  hatched: boolean;
  accessibilityLabel: string;
  onPress: () => void;
};

/** Diagonal stripes filling their (clipping) parent. */
function Hatch({ color }: { color: string }) {
  return (
    <View pointerEvents="none" style={styles.hatchClip}>
      {Array.from({ length: HATCH_LINES }, (_, i) => (
        <View key={i} style={[styles.hatchLine, { backgroundColor: color, left: i * HATCH_GAP - PLOT_HEIGHT }]} />
      ))}
    </View>
  );
}

function TrendBar({ day, height, width, dimmed, selected, hatched, accessibilityLabel, onPress }: TrendBarProps) {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const animatedHeight = useSharedValue(0);
  const opacity = useSharedValue(1);
  const dim = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) {
      // No growing: the new height fades in
      animatedHeight.set(height);
      opacity.set(withSequence(withTiming(0.3, { duration: 0 }), withTiming(1, ReducedTiming)));
    } else {
      animatedHeight.set(settleTo(height, false));
    }
  }, [height, reducedMotion, animatedHeight, opacity]);

  useEffect(() => {
    dim.set(settleTo(dimmed ? 1 : 0, reducedMotion));
  }, [dimmed, reducedMotion, dim]);

  const barStyle = useAnimatedStyle(() => ({
    height: animatedHeight.get(),
    opacity: opacity.get() * (1 - dim.get() * 0.6),
  }));

  const stub = day.state === 'zero';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={styles.slot}>
      {day.state === 'noData' ? (
        <View style={[styles.ring, { borderColor: colors.textSecondary }]} />
      ) : (
        <Animated.View
          style={[
            styles.bar,
            hatched ? [styles.hatched, { width, borderColor: colors.chart }] : { width, backgroundColor: colors.chart },
            stub ? { height: ZERO_STUB } : barStyle,
          ]}>
          {hatched && !stub && <Hatch color={colors.chart} />}
        </Animated.View>
      )}
    </Pressable>
  );
}
