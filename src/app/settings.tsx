import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { useTheme, type ThemePreference } from '@/theme/ThemeProvider';
import { Spacing, Typography } from '@/theme/tokens';

const themeOptions: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export default function SettingsScreen() {
  const { colors, preference, setPreference } = useTheme();

  return (
    <Screen edges={['bottom']}>
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Theme</Text>
      <View accessibilityRole="radiogroup" style={styles.row}>
        {themeOptions.map((option) => (
          <Button
            key={option.value}
            label={option.label}
            variant="secondary"
            selected={preference === option.value}
            onPress={() => setPreference(option.value)}
          />
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    ...Typography.caption,
    textTransform: 'uppercase',
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
});
