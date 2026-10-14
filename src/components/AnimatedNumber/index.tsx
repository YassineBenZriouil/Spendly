import { useEffect, useState } from 'react';
import { PixelRatio, useWindowDimensions, View } from 'react-native';
import Animated, {
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { useReducedMotion } from '@/animation/reducedMotion';
import { ReducedTiming } from '@/animation/tokens';
import { settleTo } from '@/animation/transitions';
import { formatMoney } from '@/domain/money/money.format';
import { formatWithPattern, getMoneyPattern, type MoneyPattern } from '@/domain/money/money.pattern';
import { useTheme } from '@/theme/ThemeProvider';
import { FontScaleCap, NumberFont, NumberSize, type NumberSizeName } from '@/theme/tokens';

import {
  charFromRight,
  digitValue,
  foldPosition,
  numberPart,
  rollTarget,
  slotWidth,
  widthOfRightmost,
  type NumberMetrics,
} from './layout';
import { styles } from './styles';

type AnimatedNumberProps = {
  /** Amount in minor units (React state). */
  value: number;
  currencyCode: string;
  size: NumberSizeName;
  /** Optional per-frame value on the UI thread (e.g. while dragging); `value` is then the committed one. */
  live?: SharedValue<number>;
  /** Largest value `live` can reach, so every digit it may need is already laid out. */
  maxValue?: number;
  color?: string;
  /** The amount being entered: smaller, quieter currency symbol and decimals, so the whole units lead. */
  hero?: boolean;
  /** Shrink to fit the available width instead of overflowing (hero amount). */
  fit?: boolean;
  /** Speaks the formatted amount. Turn off when a parent element already describes it. */
  accessible?: boolean;
};

/** Symbol size relative to the digits for `hero`. */
const HERO_SYMBOL_SCALE = 0.5;
/** Digits column: 9 0 1 2 3 4 5 6 7 8 9 0, i.e. positions -1 to 10. */
const COLUMN_DIGITS = [9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0];

/**
 * Every amount and total in the app. Each digit rolls to its new value (in the direction of the change) while
 * unchanged digits stay still; with reduced motion, changed digits fade in instead. Fixed-width digit cells mean
 * numbers never shift sideways. Runs on the UI thread, so it can follow a value that changes every frame.
 */
export function AnimatedNumber({
  value,
  currencyCode,
  size,
  live,
  maxValue,
  color,
  hero = false,
  fit = false,
  accessible = true,
}: AnimatedNumberProps) {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const pattern = getMoneyPattern(currencyCode);
  const fontScale = Math.min(useWindowDimensions().fontScale, FontScaleCap.control);
  const fontSize = NumberSize[size] * fontScale;
  const lineHeight = PixelRatio.roundToNearestPixel(fontSize * (NumberFont.ascent + NumberFont.descent));
  const metrics: NumberMetrics = {
    digit: PixelRatio.roundToNearestPixel(fontSize * NumberFont.digitWidth),
    separator: PixelRatio.roundToNearestPixel(fontSize * NumberFont.separatorWidth),
  };
  const symbolSize = hero ? fontSize * HERO_SYMBOL_SCALE : fontSize;
  const textColor = color ?? colors.textPrimary;
  const quietColor = hero ? colors.textSecondary : textColor;

  // Follow `value` unless a live value drives the number
  const own = useSharedValue(value);
  useEffect(() => {
    own.set(value);
  }, [value, own]);
  const source = live ?? own;
  const part = useDerivedValue(() => numberPart(formatWithPattern(Math.round(source.get()), pattern), pattern));

  const committedPart = numberPart(formatWithPattern(value, pattern), pattern);
  const slotCount = Math.max(
    committedPart.length,
    maxValue === undefined ? 0 : numberPart(formatWithPattern(maxValue, pattern), pattern).length,
  );
  // Slots added after the first render (the number grew) fade in; the first render shows everything at once
  const [initialSlots] = useState(slotCount);

  // Currency symbol widths: measured once per currency, then laid out on the UI thread
  const [symbolWidths, setSymbolWidths] = useState({ prefix: 0, suffix: 0 });
  const prefixWidth = useSharedValue(0);
  const suffixWidth = useSharedValue(0);
  const containerWidth = useSharedValue(0);

  const numberWidth = useDerivedValue(() => widthOfRightmost(part.get(), part.get().length, pattern, metrics));
  const contentWidth = useDerivedValue(() => prefixWidth.get() + numberWidth.get() + suffixWidth.get());

  // Live numbers re-center smoothly as they gain or lose digits; React-driven ones are sized by React
  const anchorX = useSharedValue(0);
  useAnimatedReaction(
    () => containerWidth.get() / 2 + contentWidth.get() / 2,
    (target, previous) => {
      anchorX.set(previous === null || !live ? target : settleTo(target, reducedMotion));
    },
  );

  const scaleStyle = useAnimatedStyle(() => {
    const scale = fit && containerWidth.get() > 0 ? Math.min(1, containerWidth.get() / Math.max(contentWidth.get(), 1)) : 1;
    return { transform: [{ scale }] };
  });
  const anchorStyle = useAnimatedStyle(() => ({ transform: [{ translateX: anchorX.get() }] }));
  const prefixStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -(suffixWidth.get() + numberWidth.get() + prefixWidth.get()) }],
  }));
  const suffixStyle = useAnimatedStyle(() => ({ transform: [{ translateX: -suffixWidth.get() }] }));

  // React-driven numbers take their real width in the layout, so rows can align them
  const committedWidth =
    widthOfRightmost(committedPart, committedPart.length, pattern, metrics) + symbolWidths.prefix + symbolWidths.suffix;

  const symbolStyle = {
    fontSize: symbolSize,
    lineHeight: symbolSize * (NumberFont.ascent + NumberFont.descent),
    // Same baseline as the digits
    top: NumberFont.ascent * (fontSize - symbolSize),
    color: quietColor,
  };

  return (
    <View
      accessible={accessible}
      accessibilityLabel={accessible ? formatMoney(value, currencyCode) : undefined}
      importantForAccessibility={accessible ? 'yes' : 'no-hide-descendants'}
      onLayout={(event) => containerWidth.set(event.nativeEvent.layout.width)}
      style={[styles.container, { height: lineHeight }, live || fit ? styles.stretch : { width: committedWidth }]}>
      <Animated.View style={[styles.fill, scaleStyle]}>
        <Animated.View style={[styles.anchor, anchorStyle]}>
          {pattern.prefix !== '' && (
            <Animated.Text
              allowFontScaling={false}
              numberOfLines={1}
              onLayout={(event) => {
                const width = event.nativeEvent.layout.width;
                prefixWidth.set(width);
                setSymbolWidths((current) => ({ ...current, prefix: width }));
              }}
              style={[styles.symbol, symbolStyle, prefixStyle]}>
              {pattern.prefix}
            </Animated.Text>
          )}
          {Array.from({ length: slotCount }, (_, k) => (
            <Slot
              key={k}
              k={k}
              part={part}
              source={source}
              pattern={pattern}
              metrics={metrics}
              suffixWidth={suffixWidth}
              fontSize={fontSize}
              lineHeight={lineHeight}
              color={k <= pattern.exponent && pattern.exponent > 0 ? quietColor : textColor}
              reducedMotion={reducedMotion}
              isNew={k >= initialSlots}
              initialDigit={digitValue(charFromRight(committedPart, k), pattern)}
            />
          ))}
          {pattern.suffix !== '' && (
            <Animated.Text
              allowFontScaling={false}
              numberOfLines={1}
              onLayout={(event) => {
                const width = event.nativeEvent.layout.width;
                suffixWidth.set(width);
                setSymbolWidths((current) => ({ ...current, suffix: width }));
              }}
              style={[styles.symbol, symbolStyle, suffixStyle]}>
              {pattern.suffix}
            </Animated.Text>
          )}
        </Animated.View>
      </Animated.View>
    </View>
  );
}

type SlotProps = {
  /** Position from the right (0 = last digit). */
  k: number;
  part: SharedValue<string>;
  source: SharedValue<number>;
  pattern: MoneyPattern;
  metrics: NumberMetrics;
  suffixWidth: SharedValue<number>;
  fontSize: number;
  lineHeight: number;
  color: string;
  reducedMotion: boolean;
  isNew: boolean;
  initialDigit: number;
};

/** One character position: a rolling digit column, or a separator. */
function Slot({
  k,
  part,
  source,
  pattern,
  metrics,
  suffixWidth,
  fontSize,
  lineHeight,
  color,
  reducedMotion,
  isNew,
  initialDigit,
}: SlotProps) {
  const position = useSharedValue(Math.max(initialDigit, 0));
  const digitOpacity = useSharedValue(1);
  const shown = useSharedValue(isNew ? 0 : 1);

  useAnimatedReaction(
    () => ({ char: charFromRight(part.get(), k), value: source.get() }),
    (now, before) => {
      const present = now.char !== '';
      if (before === null) {
        shown.set(isNew ? withTiming(present ? 1 : 0, ReducedTiming) : present ? 1 : 0);
      } else if (present !== (before.char !== '')) {
        shown.set(withTiming(present ? 1 : 0, ReducedTiming));
      }

      const next = digitValue(now.char, pattern);
      if (next < 0) return;
      const previous = before === null ? -1 : digitValue(before.char, pattern);
      if (previous === next) return;
      if (previous < 0) {
        position.set(next);
      } else if (reducedMotion) {
        position.set(next);
        digitOpacity.set(0);
        digitOpacity.set(withTiming(1, ReducedTiming));
      } else {
        position.set(foldPosition(position.get()));
        position.set(settleTo(rollTarget(previous, next, now.value > before!.value), false));
      }
    },
  );

  const slotStyle = useAnimatedStyle(() => {
    const text = part.get();
    const right = suffixWidth.get() + widthOfRightmost(text, k, pattern, metrics);
    const width = slotWidth(text, k, pattern, metrics);
    return { width, opacity: shown.get(), transform: [{ translateX: -(right + width) }] };
  });
  const isDigit = useDerivedValue(() => digitValue(charFromRight(part.get(), k), pattern) >= 0);
  const digitStyle = useAnimatedStyle(() => ({ opacity: isDigit.get() ? digitOpacity.get() : 0 }));
  const separatorStyle = useAnimatedStyle(() => ({ opacity: isDigit.get() ? 0 : 1 }));
  const columnStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -(position.get() + 1) * lineHeight }] }));

  const textStyle = { fontSize, lineHeight, color };
  // The only separator this position can hold: the decimal one right after the decimals, group ones elsewhere
  const separator = pattern.exponent > 0 && k === pattern.exponent ? pattern.decimal : pattern.group;

  return (
    <Animated.View style={[styles.slot, { height: lineHeight }, slotStyle]}>
      <Animated.View style={[styles.layer, digitStyle]}>
        {/* Explicit height: otherwise the one-line window also limits the column's layout, and only "9" is drawn */}
        <Animated.Text
          allowFontScaling={false}
          style={[styles.digits, textStyle, { height: COLUMN_DIGITS.length * lineHeight }, columnStyle]}>
          {COLUMN_DIGITS.map((digit) => pattern.digits[digit]).join('\n')}
        </Animated.Text>
      </Animated.View>
      <Animated.Text allowFontScaling={false} numberOfLines={1} style={[styles.layer, styles.separator, textStyle, separatorStyle]}>
        {separator}
      </Animated.Text>
    </Animated.View>
  );
}
