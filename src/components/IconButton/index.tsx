import { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

import { useReducedMotion } from '@/animation/reducedMotion';

import { fade, settleTo } from '@/animation/transitions';
import { Icon, type IconName } from '@/components/Icon';
import { useTheme } from '@/theme/ThemeProvider';

import { styles } from './styles';
type IconButtonProps = {
  icon: IconName;
  /** Required: icon-only controls need a spoken name. */
  accessibilityLabel: string;
  onPress: () => void;
  disabled?: boolean;
  /** Filled circle (default) or bare icon. */
  variant?: 'filled' | 'plain';
};

export function IconButton({ icon, accessibilityLabel, onPress, disabled = false, variant = 'filled' }: IconButtonProps) {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const pressed = useSharedValue(0);
  const enabled = useSharedValue(disabled ? 0 : 1);

  useEffect(() => {
    enabled.set(settleTo(disabled ? 0 : 1, reducedMotion));
  }, [disabled, reducedMotion, enabled]);

  const rest = variant === 'filled' ? colors.surfaceSecondary : 'transparent';

  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(pressed.get(), [0, 1], [rest, colors.borderSubtle]),
    opacity: interpolate(enabled.get(), [0, 1], [0.35, 1]),
  }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => pressed.set(settleTo(1, reducedMotion))}
      onPressOut={() => pressed.set(settleTo(0, reducedMotion))}>
      <Animated.View style={[styles.button, animatedStyle]}>
        {/* Keyed and stacked so a swapped icon (e.g. keypad -> close) cross-fades in place */}
        <Animated.View
          key={icon}
          entering={fade.entering}
          exiting={fade.exiting}
          style={[StyleSheet.absoluteFill, styles.icon]}>
          <Icon name={icon} color={colors.textPrimary} size={22} />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}
