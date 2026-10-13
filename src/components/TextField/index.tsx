import { useEffect, useState } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';
import Animated, { FadeOut, interpolateColor, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { useReducedMotion } from '@/animation/reducedMotion';
import { ReducedTiming } from '@/animation/tokens';
import { settleTo, useEnterTransition } from '@/animation/transitions';
import { Icon, type IconName } from '@/components/Icon';
import { IconButton } from '@/components/IconButton';
import { useTheme } from '@/theme/ThemeProvider';

import { styles } from './styles';

type TextFieldProps = Pick<
  TextInputProps,
  'value' | 'onChangeText' | 'placeholder' | 'maxLength' | 'returnKeyType' | 'autoCapitalize'
> & {
  /** Required: placeholders are not labels. */
  accessibilityLabel: string;
  icon?: IconName;
  /** Shows a clear button while there is text. */
  clearable?: boolean;
};

export function TextField({ icon, clearable, accessibilityLabel, value, onChangeText, ...inputProps }: TextFieldProps) {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const entering = useEnterTransition();
  const [focused, setFocused] = useState(false);
  const focus = useSharedValue(0);

  useEffect(() => {
    focus.set(settleTo(focused ? 1 : 0, reducedMotion));
  }, [focused, reducedMotion, focus]);

  const fieldStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(focus.get(), [0, 1], [colors.borderSubtle, colors.textPrimary]),
  }));

  return (
    <Animated.View style={[styles.field, { backgroundColor: colors.surface }, fieldStyle]}>
      {icon && <Icon name={icon} color={colors.textSecondary} size={18} />}
      <TextInput
        {...inputProps}
        value={value}
        onChangeText={onChangeText}
        accessibilityLabel={accessibilityLabel}
        placeholderTextColor={colors.textSecondary}
        selectionColor={colors.textPrimary}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[styles.input, { color: colors.textPrimary }]}
      />
      {/* Fixed-width slot so the text doesn't shift when the clear button comes and goes */}
      <View style={clearable ? styles.clearSlot : styles.trailingSpace}>
        {clearable && !!value && (
          <Animated.View entering={entering} exiting={FadeOut.duration(ReducedTiming.duration).reduceMotion(ReducedTiming.reduceMotion)}>
            <IconButton icon="close" variant="plain" accessibilityLabel="Clear" onPress={() => onChangeText?.('')} />
          </Animated.View>
        )}
      </View>
    </Animated.View>
  );
}
