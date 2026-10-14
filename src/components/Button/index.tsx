import { useEffect } from 'react';
import { Pressable } from 'react-native';
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

import { useReducedMotion } from '@/animation/reducedMotion';
import { settleTo } from '@/animation/transitions';
import { useTheme } from '@/theme/ThemeProvider';

import { styles } from './styles';

type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  selected?: boolean;
  accessibilityHint?: string;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  selected,
  accessibilityHint,
}: ButtonProps) {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const pressed = useSharedValue(0);
  const selection = useSharedValue(selected ? 1 : 0);
  const enabled = useSharedValue(disabled ? 0 : 1);

  useEffect(() => {
    selection.set(settleTo(selected ? 1 : 0, reducedMotion));
  }, [selected, reducedMotion, selection]);

  useEffect(() => {
    enabled.set(settleTo(disabled ? 0 : 1, reducedMotion));
  }, [disabled, reducedMotion, enabled]);

  const background = variant === 'primary' ? colors.accent : colors.surfaceSecondary;
  const pressedBackground = variant === 'primary' ? colors.accentPressed : colors.borderSubtle;
  const textColor = variant === 'primary' ? colors.onAccent : colors.textPrimary;

  // Selected options take the accent fill (and keep the ink outline, so color is never the only cue)
  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      pressed.get(),
      [0, 1],
      [
        interpolateColor(selection.get(), [0, 1], [background, colors.accent]),
        interpolateColor(selection.get(), [0, 1], [pressedBackground, colors.accentPressed]),
      ],
    ),
    borderColor: interpolateColor(selection.get(), [0, 1], ['transparent', colors.textPrimary]),
    opacity: interpolate(enabled.get(), [0, 1], [0.4, 1]),
    transform: [{ scale: reducedMotion ? 1 : interpolate(pressed.get(), [0, 1], [1, 0.97]) }],
  }));

  const labelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(selection.get(), [0, 1], [textColor, colors.onAccent]),
  }));

  return (
    <Pressable
      // `selected` turns the button into one option of a choice group
      accessibilityRole={selected === undefined ? 'button' : 'radio'}
      accessibilityState={{ disabled, checked: selected }}
      accessibilityHint={accessibilityHint}
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => pressed.set(settleTo(1, reducedMotion))}
      onPressOut={() => pressed.set(settleTo(0, reducedMotion))}>
      <Animated.View style={[styles.button, animatedStyle]}>
        <Animated.Text style={[styles.label, labelStyle]}>{label}</Animated.Text>
      </Animated.View>
    </Pressable>
  );
}
