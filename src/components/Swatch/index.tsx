import { useEffect, type ReactNode } from 'react';
import { Pressable } from 'react-native';
import Animated, { interpolate, interpolateColor, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { useReducedMotion } from '@/animation/reducedMotion';
import { settleTo } from '@/animation/transitions';
import { useTheme } from '@/theme/ThemeProvider';

import { styles } from './styles';

type SwatchProps = {
  selected: boolean;
  onPress: () => void;
  accessibilityLabel: string;
  /** Fill color; defaults to the secondary surface. */
  color?: string;
  children?: ReactNode;
};

/** A round, selectable choice (icon or color). Selection is a ring, not color alone. */
export function Swatch({ selected, onPress, accessibilityLabel, color, children }: SwatchProps) {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const selection = useSharedValue(selected ? 1 : 0);
  const pressed = useSharedValue(0);

  useEffect(() => {
    selection.set(settleTo(selected ? 1 : 0, reducedMotion));
  }, [selected, reducedMotion, selection]);

  const ringStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(selection.get(), [0, 1], ['transparent', colors.textPrimary]),
    transform: [{ scale: reducedMotion ? 1 : interpolate(pressed.get(), [0, 1], [1, 0.9]) }],
  }));

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      onPressIn={() => pressed.set(settleTo(1, reducedMotion))}
      onPressOut={() => pressed.set(settleTo(0, reducedMotion))}>
      <Animated.View style={[styles.ring, ringStyle]}>
        <Animated.View style={[styles.fill, { backgroundColor: color ?? colors.surfaceSecondary }]}>{children}</Animated.View>
      </Animated.View>
    </Pressable>
  );
}
