import { useEffect, type ReactNode } from 'react';
import { View } from 'react-native';
import { GestureDetector, type PanGesture } from 'react-native-gesture-handler';
import Animated, { interpolate, useAnimatedStyle, useSharedValue, type SharedValue } from 'react-native-reanimated';

import { useReducedMotion } from '@/animation/reducedMotion';
import { fade, settleTo } from '@/animation/transitions';
import { AnimatedNumber } from '@/components/AnimatedNumber';
import { Icon } from '@/components/Icon';
import { formatMoney } from '@/domain/money/money.format';
import { useTheme } from '@/theme/ThemeProvider';

import { styles } from './styles';

type AmountSurfaceProps = {
  /** Displayed amount, driven on the UI thread by the drag gesture. */
  amount: SharedValue<number>;
  pulse: SharedValue<number>;
  /** Pull past 0 or the maximum (pt): the number follows it, stiffly. */
  edgeOffset: SharedValue<number>;
  gesture: PanGesture;
  /** Committed draft amount (React state). */
  amountMinor: number;
  currencyCode: string;
  /** Largest amount the drag can reach. */
  maxAmountMinor: number;
  onIncrement: () => void;
  onDecrement: () => void;
  /** Shown instead of the drag hint while the amount is zero (e.g. amount suggestions). */
  accessory?: ReactNode;
};

export function AmountSurface({
  amount,
  pulse,
  edgeOffset,
  gesture,
  amountMinor,
  currencyCode,
  maxAmountMinor,
  onIncrement,
  onDecrement,
  accessory,
}: AmountSurfaceProps) {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const hintVisible = useSharedValue(amountMinor === 0 ? 1 : 0);

  // Keypad, suggestions, +/-, reset and save change the draft: show it (each changed digit rolls to it).
  // After a drag the draft already equals the display, so nothing happens.
  useEffect(() => {
    if (amount.get() !== amountMinor) amount.set(amountMinor);
  }, [amountMinor, amount]);

  useEffect(() => {
    hintVisible.set(settleTo(amountMinor === 0 ? 1 : 0, reducedMotion));
  }, [amountMinor, reducedMotion, hintVisible]);

  const amountStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: edgeOffset.get() }, { scale: pulse.get() }],
  }));

  const hintStyle = useAnimatedStyle(() => ({
    opacity: hintVisible.get(),
    transform: [{ translateY: reducedMotion ? 0 : interpolate(hintVisible.get(), [0, 1], [6, 0]) }],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <View style={styles.surface}>
        <Animated.View
          style={[styles.amount, amountStyle]}
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
          <AnimatedNumber
            value={amountMinor}
            live={amount}
            maxValue={maxAmountMinor}
            currencyCode={currencyCode}
            size="hero"
            hero
            fit
            accessible={false}
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
