import { ScrollView } from 'react-native';

import { Button } from '@/components/Button';
import { EdgeToEdge } from '@/theme/tokens';

import { styles } from './styles';

type OptionGroupProps<T extends string | number> = {
  /** Spoken name of the group. */
  accessibilityLabel: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
};

/** One-of-n choice as a row of buttons; scrolls sideways when the labels don't fit. */
export function OptionGroup<T extends string | number>({ accessibilityLabel, options, value, onChange }: OptionGroupProps<T>) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      // Runs to the screen edges instead of being cut at the gutter
      style={EdgeToEdge.scroll}
      contentContainerStyle={[styles.row, EdgeToEdge.content]}>
      {options.map((option) => (
        <Button
          key={option.value}
          label={option.label}
          variant="secondary"
          selected={option.value === value}
          onPress={() => onChange(option.value)}
        />
      ))}
    </ScrollView>
  );
}
