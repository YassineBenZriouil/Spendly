import { useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

import { useReducedMotion } from '@/animation/reducedMotion';
import { settleTo } from '@/animation/transitions';
import { Icon } from '@/components/Icon';
import { applyKeypadKey, inputToMinor, minorToInput, type KeypadKey } from '@/domain/money/money.parse';
import type { MoneyPattern } from '@/domain/money/money.pattern';
import { useTheme } from '@/theme/ThemeProvider';
import { FontScaleCap } from '@/theme/tokens';
import { t } from '@/i18n';

import { styles } from './styles';

type KeypadProps = {
  amountMinor: number;
  pattern: MoneyPattern;
  maxAmountMinor: number;
  onChange: (amountMinor: number) => void;
};

const DIGIT_ROWS: KeypadKey[][] = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
];

/** Numeric alternative to dragging (accessibility, exact amounts). */
export function Keypad({ amountMinor, pattern, maxAmountMinor, onChange }: KeypadProps) {
  const { exponent } = pattern;
  const [input, setInput] = useState(() => minorToInput(amountMinor, exponent));

  // Amount changed elsewhere (drag, +/-, reset): restart typing from it
  if (inputToMinor(input, exponent) !== amountMinor) {
    setInput(minorToInput(amountMinor, exponent));
  }

  const press = (key: KeypadKey) => {
    const next = applyKeypadKey(input, key, exponent);
    const nextMinor = inputToMinor(next, exponent);
    if (nextMinor > maxAmountMinor) return;
    setInput(next);
    if (nextMinor !== amountMinor) onChange(nextMinor);
  };

  const lastRow: (KeypadKey | null)[] = [exponent > 0 ? 'decimal' : null, '0', 'backspace'];

  return (
    <View style={styles.keypad}>
      {[...DIGIT_ROWS, lastRow].map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((key, i) =>
            key === null ? (
              <View key={`empty-${i}`} style={styles.empty} />
            ) : (
              <Key key={key} keyName={key} pattern={pattern} onPress={() => press(key)} />
            ),
          )}
        </View>
      ))}
    </View>
  );
}

function Key({ keyName, pattern, onPress }: { keyName: KeypadKey; pattern: MoneyPattern; onPress: () => void }) {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(pressed.get(), [0, 1], [colors.surfaceSecondary, colors.borderSubtle]),
    transform: [{ scale: reducedMotion ? 1 : interpolate(pressed.get(), [0, 1], [1, 0.94]) }],
  }));

  const label =
    keyName === 'decimal' ? pattern.decimal : keyName === 'backspace' ? null : pattern.digits[Number(keyName)];

  return (
    <Pressable
      accessibilityRole="keyboardkey"
      accessibilityLabel={keyName === 'decimal'
          ? t('quickAdd.keypad.decimal')
          : keyName === 'backspace'
            ? t('quickAdd.keypad.delete')
            : keyName}
      onPress={onPress}
      onPressIn={() => pressed.set(settleTo(1, reducedMotion))}
      onPressOut={() => pressed.set(settleTo(0, reducedMotion))}
      style={styles.keyCell}>
      <Animated.View style={[styles.key, animatedStyle]}>
        {label === null ? (
          <Icon name="backspace" color={colors.textPrimary} size={22} />
        ) : (
          <Animated.Text maxFontSizeMultiplier={FontScaleCap.control} style={[styles.keyLabel, { color: colors.textPrimary }]}>{label}</Animated.Text>
        )}
      </Animated.View>
    </Pressable>
  );
}
