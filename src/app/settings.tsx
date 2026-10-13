import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { expenseRepository } from '@/domain/expense/expense.repository';
import { sampleExpenses } from '@/domain/expense/sampleExpenses';
import { loadPreferences } from '@/storage/preferences/preferences';
import { useTheme, type ThemePreference } from '@/theme/ThemeProvider';
import { Spacing, Typography } from '@/theme/tokens';

const themeOptions: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export default function SettingsScreen() {
  const { colors, preference, setPreference } = useTheme();
  const [seeding, setSeeding] = useState(false);

  const seed = async () => {
    setSeeding(true);
    try {
      await expenseRepository.saveMany(sampleExpenses(1000, loadPreferences().currencyCode));
      Alert.alert('Added 1,000 sample expenses', 'Their note is "Sample data", so you can search for them.');
    } catch {
      Alert.alert("Couldn't add sample expenses");
    } finally {
      setSeeding(false);
    }
  };

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

      {__DEV__ && (
        <>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Developer</Text>
          <View style={styles.row}>
            <Button label="Add 1,000 sample expenses" variant="secondary" disabled={seeding} onPress={seed} />
          </View>
        </>
      )}
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
