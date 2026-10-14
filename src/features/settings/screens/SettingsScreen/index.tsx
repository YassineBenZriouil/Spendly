import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Alert, ScrollView, Switch, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useEnterTransition } from '@/animation/transitions';
import { Button } from '@/components/Button';
import { ListRow } from '@/components/ListRow';
import { OptionGroup } from '@/components/OptionGroup';
import { Screen } from '@/components/Screen';
import { expenseRepository } from '@/domain/expense/expense.repository';
import { sampleExpenses } from '@/domain/expense/sampleExpenses';
import { formatMoney } from '@/domain/money/money.format';
import { baseStepMinor } from '@/features/quick-add/utils/dragMapping';
import { haptics } from '@/haptics/haptics.service';
import {
  updatePreferences,
  usePreferences,
  type AmountIncrement,
  type AppPreferences,
  type DragSensitivity,
} from '@/storage/preferences/preferences';
import { useTheme } from '@/theme/ThemeProvider';
import { EdgeToEdge } from '@/theme/tokens';

import { styles } from './styles';

const INCREMENTS: AmountIncrement[] = [1, 5, 10, 50];

export function SettingsScreen() {
  const { colors } = useTheme();
  const entering = useEnterTransition();
  const preferences = usePreferences();
  const { currencyCode } = preferences;
  const [seeding, setSeeding] = useState(false);

  const seed = async () => {
    setSeeding(true);
    try {
      await expenseRepository.saveMany(sampleExpenses(1000, currencyCode));
      Alert.alert('Added 1,000 sample expenses', 'Their note is "Sample data", so you can search for them.');
    } catch {
      Alert.alert("Couldn't add sample expenses");
    } finally {
      setSeeding(false);
    }
  };

  return (
    <Screen edges={['bottom']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={EdgeToEdge.scroll}
        contentContainerStyle={[styles.content, EdgeToEdge.content]}>
        <Animated.View entering={entering} style={styles.sections}>
          <Section title="Categories">
            <ListRow
              icon="other"
              label="Manage categories"
              caption="Reorder, hide, rename or add your own"
              onPress={() => router.push('/categories')}
            />
          </Section>

          <Section title="Money">
            <ListRow
              icon="savings"
              label="Currency"
              caption="For new expenses. Past expenses keep their own currency."
              value={currencyCode}
              onPress={() => router.push('/settings/currency')}
            />
            <Setting label="Drag sensitivity">
              <OptionGroup<DragSensitivity>
                accessibilityLabel="Drag sensitivity"
                options={[
                  { value: 'precise', label: 'Precise' },
                  { value: 'balanced', label: 'Balanced' },
                  { value: 'fast', label: 'Fast' },
                ]}
                value={preferences.dragSensitivity}
                onChange={(dragSensitivity) => updatePreferences({ dragSensitivity })}
              />
            </Setting>
            <Setting label="Amount step">
              <OptionGroup<AmountIncrement>
                accessibilityLabel="Amount step"
                options={INCREMENTS.map((increment) => ({
                  value: increment,
                  label: formatMoney(baseStepMinor(currencyCode) * increment, currencyCode),
                }))}
                value={preferences.amountIncrement}
                onChange={(amountIncrement) => updatePreferences({ amountIncrement })}
              />
            </Setting>
          </Section>

          <Section title="Quick Add">
            <ListRow
              label="Haptics"
              caption="Subtle taps when picking, dragging and saving"
              accessory={
                <Switch
                  accessibilityLabel="Haptics"
                  value={preferences.hapticsEnabled}
                  onValueChange={(hapticsEnabled) => {
                    updatePreferences({ hapticsEnabled });
                    // Confirms the change by feel when turned on
                    haptics.select();
                  }}
                  trackColor={{ true: colors.success, false: colors.borderSubtle }}
                  thumbColor={colors.surface}
                  ios_backgroundColor={colors.borderSubtle}
                />
              }
            />
          </Section>

          <Section title="Appearance">
            <Setting label="Theme">
              <OptionGroup<AppPreferences['theme']>
                accessibilityLabel="Theme"
                options={[
                  { value: 'system', label: 'System' },
                  { value: 'light', label: 'Light' },
                  { value: 'dark', label: 'Dark' },
                ]}
                value={preferences.theme}
                onChange={(theme) => updatePreferences({ theme })}
              />
            </Setting>
            <Setting label="Reduce motion" caption="On: movement is replaced by short fades.">
              <OptionGroup<AppPreferences['reducedMotion']>
                accessibilityLabel="Reduce motion"
                options={[
                  { value: 'system', label: 'System' },
                  { value: 'on', label: 'On' },
                  { value: 'off', label: 'Off' },
                ]}
                value={preferences.reducedMotion}
                onChange={(reducedMotion) => updatePreferences({ reducedMotion })}
              />
            </Setting>
          </Section>

          <Section title="Data">
            <ListRow
              icon="export"
              label="Export to CSV"
              caption="Pick a date range and share the file"
              onPress={() => router.push('/settings/export')}
            />
            <View style={styles.dataRow}>
              <Button label="Sync data" variant="secondary" disabled accessibilityHint="Coming soon" />
            </View>
            <Text style={[styles.note, { color: colors.textSecondary }]}>Sync is coming soon.</Text>
          </Section>

          <Section title="About">
            <ListRow
              icon="dragHint"
              label="Replay introduction"
              caption="The 3-step practice from the first launch"
              onPress={() => router.push('/onboarding')}
            />
            <Text style={[styles.note, { color: colors.textSecondary }]}>
              Spendly keeps everything on this device. There is no account, nothing is uploaded, and nothing is
              tracked.
            </Text>
            <Text style={[styles.note, { color: colors.textSecondary }]}>
              Version {Constants.expoConfig?.version ?? '1.0.0'}
            </Text>
          </Section>

          {__DEV__ && (
            <Section title="Developer">
              <View style={styles.dataRow}>
                <Button label="Add 1,000 sample expenses" variant="secondary" disabled={seeding} onPress={seed} />
              </View>
            </Section>
          )}
        </Animated.View>
      </ScrollView>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={[styles.sectionTitle, { color: colors.textSecondary }]}>
        {title}
      </Text>
      {children}
    </View>
  );
}

/** A labelled control that sits under its label rather than beside it. */
function Setting({ label, caption, children }: { label: string; caption?: string; children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={styles.setting}>
      <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>{label}</Text>
      {caption && <Text style={[styles.note, { color: colors.textSecondary }]}>{caption}</Text>}
      {children}
    </View>
  );
}
