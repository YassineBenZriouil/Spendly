import { useEffect, type ReactNode } from 'react';
import { TextInput, useWindowDimensions, View, type TextInputProps } from 'react-native';
import { GestureDetector, type PanGesture } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { useReducedMotion } from '@/animation/reducedMotion';
import { ReducedTiming } from '@/animation/tokens';
import { fade, settleTo } from '@/animation/transitions';
import { Icon } from '@/components/Icon';
import { formatMoney } from '@/domain/money/money.format';
import { formatWithPattern, type MoneyPattern } from '@/domain/money/money.pattern';
import { useTheme } from '@/theme/ThemeProvider';
import { FontScaleCap, Typography } from '@/theme/tokens';

import { styles } from './styles';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

/** Rough width of a tabular digit relative to font size, used to shrink long amounts to fit. */
const CHAR_WIDTH_RATIO = 0.62;

type AmountSurfaceProps = {
  /** Displayed amount, driven on the UI thread by the drag gesture. */
  amount: SharedValue<number>;
  pulse: SharedValue<number>;
  gesture: PanGesture;
  /** Committed draft amount (React state). */
  amountMinor: number;
  currencyCode: string;
  pattern: MoneyPattern;
  onIncrement: () => void;
  onDecrement: () => void;
  /** Shown instead of the drag hint while the amount is zero (e.g. amount suggestions). */
  accessory?: ReactNode;
};

export function AmountSurface({
  amount,
  pulse,
  gesture,
  amountMinor,
  currencyCode,
  pattern,
  onIncrement,
  onDecrement,
  accessory,
}: AmountSurfaceProps) {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const width = useSharedValue(0);
  // Large accessibility text renders the amount bigger: include it when shrinking long amounts to fit
  const fontScale = Math.min(useWindowDimensions().fontScale, FontScaleCap.control);
  const hintVisible = useSharedValue(amountMinor === 0 ? 1 : 0);

  // Keypad, +/-, reset and save change the draft: count the displayed amount to it.
  // After a drag the draft already equals the display, so nothing happens.
  useEffect(() => {
    if (amount.get() !== amountMinor) amount.set(withTiming(amountMinor, ReducedTiming));
  }, [amountMinor, amount]);

  useEffect(() => {
    hintVisible.set(settleTo(amountMinor === 0 ? 1 : 0, reducedMotion));
  }, [amountMinor, reducedMotion, hintVisible]);

  const animatedProps = useAnimatedProps(
    () => ({ text: formatWithPattern(Math.round(amount.get()), pattern) }) as unknown as TextInputProps,
  );

  const amountStyle = useAnimatedStyle(() => {
    const text = formatWithPattern(Math.round(amount.get()), pattern);
    const natural = text.length * Typography.amount.fontSize * fontScale * CHAR_WIDTH_RATIO;
    const fit = width.get() > 0 ? Math.min(1, width.get() / natural) : 1;
    return { transform: [{ scale: fit * pulse.get() }] };
  });

  const hintStyle = useAnimatedStyle(() => ({
    opacity: hintVisible.get(),
    transform: [{ translateY: reducedMotion ? 0 : interpolate(hintVisible.get(), [0, 1], [6, 0]) }],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <View style={styles.surface} onLayout={(e) => width.set(e.nativeEvent.layout.width)}>
        <Animated.View
          style={amountStyle}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel="Amount"
          accessibilityValue={{ text: formatMoney(amountMinor, currencyCode) }}
          accessibilityHint="Drag up or down to change the amount, or use the keypad"
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={(event) => {
            if (event.nativeEvent.actionName === 'increment') onIncrement();
            if (event.nativeEvent.actionName === 'decrement') onDecrement();
          }}>
          <AnimatedTextInput
            editable={false}
            maxFontSizeMultiplier={FontScaleCap.control}
            pointerEvents="none"
            underlineColorAndroid="transparent"
            defaultValue={formatWithPattern(amountMinor, pattern)}
            animatedProps={animatedProps}
            style={[styles.amount, { color: colors.textPrimary }]}
          />
        </Animated.View>

        {/* Fixed-height slot, so swapping the hint for suggestions never moves the amount */}
        <Animated.View
          style={[styles.slot, hintStyle]}
          pointerEvents={amountMinor === 0 ? 'box-none' : 'none'}
          accessibilityElementsHidden={amountMinor !== 0}
          importantForAccessibility={amountMinor === 0 ? 'auto' : 'no-hide-descendants'}>
          {accessory ? (
            <Animated.View key="accessory" {...fade} style={styles.slotLayer}>
              {accessory}
            </Animated.View>
          ) : (
            // The amount's own hint already tells screen readers how to drag
            <Animated.View
              key="hint"
              {...fade}
              style={[styles.slotLayer, styles.hint]}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants">
              <Icon name="dragHint" color={colors.textSecondary} size={14} />
              <Animated.Text style={[styles.hintText, { color: colors.textSecondary }]}>Drag up or down</Animated.Text>
            </Animated.View>
          )}
        </Animated.View>
      </View>
    </GestureDetector>
  );
}
