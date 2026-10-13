import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useReducedMotion } from '@/animation/reducedMotion';
import { ReducedTiming } from '@/animation/tokens';
import { settleTo } from '@/animation/transitions';
import type { Insights } from '@/domain/insights/insights.service';
import type { PeriodKind } from '@/domain/insights/period';
import { deviceLocale, formatMoney } from '@/domain/money/money.format';
import { useTheme } from '@/theme/ThemeProvider';
import { formatDay } from '@/utils/dateFormat';

import { PLOT_HEIGHT, styles } from './styles';

type Day = Insights['days'][number];

type TrendChartProps = {
  days: Day[];
  kind: PeriodKind;
  currencyCode: string;
};

/** Bars never fill their slot: capped at 24pt, with at least a 2pt surface gap between neighbours. */
const MAX_BAR = 24;
const GAP = 2;
/** A zero day is a visible stub on the baseline; "no data" is a hollow ring instead. */
const ZERO_STUB = 2;

const fade = {
  entering: FadeIn.duration(ReducedTiming.duration).reduceMotion(ReducedTiming.reduceMotion),
  exiting: FadeOut.duration(ReducedTiming.duration).reduceMotion(ReducedTiming.reduceMotion),
};

/** Daily spending for the period: one series, one color. Tap a bar for its value. */
export function TrendChart({ days, kind, currencyCode }: TrendChartProps) {
  const { colors } = useTheme();
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
        ? 'Nothing spent'
        : 'No data';

  const readout = selectedDay
    ? `${formatDay(selectedDay.day)} · ${describe(selectedDay)}`
    : max > 0
      ? `Highest day · ${formatMoney(max, currencyCode)}`
      : 'No spending yet in this period';

  return (
    <View style={styles.chart}>
      {/* Keyed so the readout cross-fades when a bar is tapped */}
      <View style={styles.readoutSlot} accessibilityLiveRegion="polite">
        <Animated.Text key={readout} {...fade} numberOfLines={1} style={[styles.readout, { color: colors.textPrimary }]}>
          {readout}
        </Animated.Text>
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
              accessibilityLabel={`${formatDay(day.day)}, ${describe(day)}`}
              onPress={() => setSelected(selected === index ? null : index)}
            />
          ))}
        </View>
      </View>

      <View style={styles.labels}>
        {days.map((day, index) => (
          <Text key={index} style={[styles.label, { color: colors.textSecondary }]}>
            {kind === 'week' ? weekday.format(day.day) : [1, 8, 15, 22, 29].includes(day.day.getDate()) ? day.day.getDate() : ''}
          </Text>
        ))}
      </View>

      <View style={styles.legend} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <LegendItem label="Spent">
          <View style={[styles.keyBar, { backgroundColor: colors.chart }]} />
        </LegendItem>
        <LegendItem label="Nothing spent">
          <View style={[styles.keyStub, { backgroundColor: colors.chart }]} />
        </LegendItem>
        <LegendItem label="No data">
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
  accessibilityLabel: string;
  onPress: () => void;
};

function TrendBar({ day, height, width, dimmed, selected, accessibilityLabel, onPress }: TrendBarProps) {
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
            { width, backgroundColor: colors.chart },
            stub ? { height: ZERO_STUB } : barStyle,
          ]}
        />
      )}
    </Pressable>
  );
}
