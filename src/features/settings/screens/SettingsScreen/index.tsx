import Constants from 'expo-constants';
import { reloadAppAsync } from 'expo';
import { router } from 'expo-router';
import { useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Alert, ScrollView, Switch, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { fade, useEnterTransition, useLayoutTransition } from '@/animation/transitions';
import { Button } from '@/components/Button';
import { ErrorBanner } from '@/components/ErrorBanner';
import { ListRow } from '@/components/ListRow';
import { OptionGroup } from '@/components/OptionGroup';
import { Screen } from '@/components/Screen';
import { Swatch } from '@/components/Swatch';
import { expenseRepository } from '@/domain/expense/expense.repository';
import { sampleExpenses } from '@/domain/expense/sampleExpenses';
import type { Backup } from '@/domain/backup/backup';
import { formatMoney } from '@/domain/money/money.format';
import { applyBackup, pickBackup, shareBackup } from '@/features/backup/backupActions';
import { baseStepMinor } from '@/features/quick-add/utils/dragMapping';
import { haptics } from '@/haptics/haptics.service';
import {
  updatePreferences,
  usePreferencesSaveError,
  usePreferences,
  type AmountIncrement,
  type AppPreferences,
  type DragSensitivity,
} from '@/storage/preferences/preferences';
import { useTheme } from '@/theme/ThemeProvider';
import { AccentNames, Accents, EdgeToEdge, type ThemeStyle } from '@/theme/tokens';
import { formatDay } from '@/utils/dateFormat';
import { writeFailureMessage } from '@/storage/database/errors';
import { languagePreference, type LanguagePreference, type MessageKey, setLanguagePreference, t } from '@/i18n';

import { styles } from './styles';

const INCREMENTS: AmountIncrement[] = [1, 5, 10, 50];

export function SettingsScreen() {
  const { colors, scheme } = useTheme();
  const entering = useEnterTransition();
  const preferences = usePreferences();
  const saveError = usePreferencesSaveError();

  // Language is read once at launch (every screen and the layout direction depend on it), so a change restarts
  const changeLanguage = (next: LanguagePreference) => {
    if (next === languagePreference) return;
    Alert.alert(t('settings.language.restartTitle'), t('settings.language.restartMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.language.restart'),
        onPress: () => {
          setLanguagePreference(next);
          reloadAppAsync().catch(() => {
            // Applied on the next start anyway
          });
        },
      },
    ]);
  };
  // One backup or restore at a time (the share sheet and picker are modal, but taps can land before they open)
  const dataBusy = useRef(false);

  const backUp = async () => {
    if (dataBusy.current) return;
    dataBusy.current = true;
    try {
      const count = await shareBackup();
      AccessibilityInfo.announceForAccessibility(t('data.backUp.ready', { expenses: t('common.expenseCount', { count }) }));
    } catch (error) {
      Alert.alert(t('data.backUp.failedTitle'), writeFailureMessage(error, t('data.backUp.failedMessage')));
    } finally {
      dataBusy.current = false;
    }
  };

  const runRestore = async (backup: Backup) => {
    try {
      const result = await applyBackup(backup);
      const counts = {
        expenses: t('common.expenseCount', { count: result.expensesAdded }),
        categories: t('common.categoryCount', { count: result.categoriesAdded }),
      };
      const summary =
        result.expensesAlreadyHere > 0
          ? t('data.restore.summaryWithExisting', {
              ...counts,
              existing: t('common.expenseCount', { count: result.expensesAlreadyHere }),
            })
          : t('data.restore.summary', counts);
      Alert.alert(t('data.restore.doneTitle'), summary);
      AccessibilityInfo.announceForAccessibility(t('data.restore.announcement', { summary }));
    } catch (error) {
      Alert.alert(t('data.restore.failedTitle'), writeFailureMessage(error, t('common.error.nothingChanged')));
    }
  };

  const restore = async () => {
    if (dataBusy.current) return;
    dataBusy.current = true;
    try {
      const result = await pickBackup();
      if (!result) return;
      if (!result.ok) {
        Alert.alert(t('data.restore.cantRestoreTitle'), result.reason);
        return;
      }
      const { backup } = result;
      Alert.alert(
        t('data.restore.confirmTitle'),
        t('data.restore.confirmMessage', {
          expenses: t('common.expenseCount', { count: backup.expenses.length }),
          date: formatDay(new Date(backup.createdAt)),
        }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('data.restore.confirmButton'), onPress: () => runRestore(backup) },
        ],
      );
    } catch {
      Alert.alert(t('data.restore.openFailedTitle'), t('data.restore.openFailedMessage'));
    } finally {
      dataBusy.current = false;
    }
  };
  const { currencyCode } = preferences;
  const [seeding, setSeeding] = useState(false);

  const seed = async (count: 1000 | 10000) => {
    setSeeding(true);
    try {
      await expenseRepository.saveMany(sampleExpenses(count, currencyCode));
      const title = count === 1000 ? t('settings.developer.samplesAddedTitle') : t('settings.developer.samplesAddedTitle10k');
      Alert.alert(title, t('settings.developer.samplesAddedMessage'));
    } catch {
      Alert.alert(t('settings.developer.samplesFailed'));
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
          {saveError && <ErrorBanner message={saveError} />}
          <Section title={t('settings.section.categories')}>
            <ListRow
              icon="other"
              label={t('settings.manageCategories.label')}
              caption={t('settings.manageCategories.caption')}
              onPress={() => router.push('/categories')}
            />
          </Section>

          <Section title={t('settings.section.money')}>
            <ListRow
              icon="savings"
              label={t('settings.currency.label')}
              caption={t('settings.currency.caption')}
              value={currencyCode}
              onPress={() => router.push('/settings/currency')}
            />
            <ListRow
              icon="insights"
              label={t('settings.budget.label')}
              caption={t('settings.budget.caption')}
              value={preferences.budget?.currencyCode === currencyCode && preferences.budget.monthlyMinor
                ? formatMoney(preferences.budget.monthlyMinor, currencyCode)
                : undefined}
              onPress={() => router.push('/settings/budget')}
            />
            <Setting label={t('settings.dragSensitivity.label')}>
              <OptionGroup<DragSensitivity>
                accessibilityLabel={t('settings.dragSensitivity.label')}
                options={[
                  { value: 'precise', label: t('settings.dragSensitivity.precise') },
                  { value: 'balanced', label: t('settings.dragSensitivity.balanced') },
                  { value: 'fast', label: t('settings.dragSensitivity.fast') },
                ]}
                value={preferences.dragSensitivity}
                onChange={(dragSensitivity) => updatePreferences({ dragSensitivity })}
              />
            </Setting>
            <Setting label={t('settings.amountStep.label')}>
              <OptionGroup<AmountIncrement>
                accessibilityLabel={t('settings.amountStep.label')}
                options={INCREMENTS.map((increment) => ({
                  value: increment,
                  label: formatMoney(baseStepMinor(currencyCode) * increment, currencyCode),
                }))}
                value={preferences.amountIncrement}
                onChange={(amountIncrement) => updatePreferences({ amountIncrement })}
              />
            </Setting>
          </Section>

          <Section title={t('settings.section.quickAdd')}>
            <ListRow
              label={t('settings.haptics.label')}
              caption={t('settings.haptics.caption')}
              accessory={
                <Switch
                  accessibilityLabel={t('settings.haptics.label')}
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

          <Section title={t('settings.section.appearance')}>
            <Setting label={t('settings.language.label')}>
              <OptionGroup<LanguagePreference>
                accessibilityLabel={t('settings.language.label')}
                options={[
                  { value: 'system', label: t('settings.language.system') },
                  { value: 'en', label: t('settings.language.english') },
                  { value: 'ar', label: t('settings.language.arabic') },
                ]}
                value={languagePreference}
                onChange={changeLanguage}
              />
            </Setting>
            <Setting label={t('settings.style.label')} caption={t('settings.style.caption')}>
              <OptionGroup<ThemeStyle>
                accessibilityLabel={t('settings.style.label')}
                options={[
                  { value: 'mono', label: t('settings.style.mono') },
                  { value: 'color', label: t('settings.style.color') },
                ]}
                value={preferences.themeStyle}
                onChange={(themeStyle) => updatePreferences({ themeStyle })}
              />
            </Setting>
            {preferences.themeStyle === 'color' && (
              <Animated.View {...fade}>
                <Setting label={t('settings.accent.label')}>
                  <View accessibilityRole="radiogroup" accessibilityLabel={t('settings.accent.label')} style={styles.accents}>
                    {AccentNames.map((name) => (
                      <Swatch
                        key={name}
                        accessibilityLabel={t(`settings.accent.${name}` as MessageKey)}
                        selected={preferences.accent === name}
                        color={Accents[name][scheme].accent}
                        onPress={() => updatePreferences({ accent: name })}
                      />
                    ))}
                  </View>
                </Setting>
              </Animated.View>
            )}
            <Setting label={t('settings.theme.label')}>
              <OptionGroup<AppPreferences['theme']>
                accessibilityLabel={t('settings.theme.label')}
                options={[
                  { value: 'system', label: t('settings.theme.system') },
                  { value: 'light', label: t('settings.theme.light') },
                  { value: 'dark', label: t('settings.theme.dark') },
                ]}
                value={preferences.theme}
                onChange={(theme) => updatePreferences({ theme })}
              />
            </Setting>
            <Setting label={t('settings.reduceMotion.label')} caption={t('settings.reduceMotion.caption')}>
              <OptionGroup<AppPreferences['reducedMotion']>
                accessibilityLabel={t('settings.reduceMotion.label')}
                options={[
                  { value: 'system', label: t('settings.reduceMotion.system') },
                  { value: 'on', label: t('settings.reduceMotion.on') },
                  { value: 'off', label: t('settings.reduceMotion.off') },
                ]}
                value={preferences.reducedMotion}
                onChange={(reducedMotion) => updatePreferences({ reducedMotion })}
              />
            </Setting>
          </Section>

          <Section title={t('settings.section.data')}>
            <ListRow
              icon="backup"
              label={t('data.backUp.label')}
              caption={t('data.backUp.caption')}
              onPress={backUp}
            />
            <ListRow
              icon="restore"
              label={t('data.restore.label')}
              caption={t('data.restore.caption')}
              onPress={restore}
            />
            <ListRow
              icon="export"
              label={t('data.export.label')}
              caption={t('data.export.caption')}
              onPress={() => router.push('/settings/export')}
            />
            <View style={styles.dataRow}>
              <Button label={t('settings.sync.label')} variant="secondary" disabled accessibilityHint={t('settings.sync.hint')} />
            </View>
            <Text style={[styles.note, { color: colors.textSecondary }]}>{t('settings.sync.note')}</Text>
          </Section>

          <Section title={t('settings.section.about')}>
            <ListRow
              icon="dragHint"
              label={t('settings.replayIntro.label')}
              caption={t('settings.replayIntro.caption')}
              onPress={() => router.push('/onboarding')}
            />
            <Text style={[styles.note, { color: colors.textSecondary }]}>
              {t('settings.about.privacy')}
            </Text>
            <Text style={[styles.note, { color: colors.textSecondary }]}>
              {t('settings.about.version', { version: Constants.expoConfig?.version ?? '1.0.0' })}
            </Text>
          </Section>

          {__DEV__ && (
            <Section title={t('settings.section.developer')}>
              <View style={styles.dataRow}>
                <Button label={t('settings.developer.addSamples')} variant="secondary" disabled={seeding} onPress={() => seed(1000)} />
                <Button label={t('settings.developer.addSamples10k')} variant="secondary" disabled={seeding} onPress={() => seed(10000)} />
              </View>
            </Section>
          )}
        </Animated.View>
      </ScrollView>
    </Screen>
  );
}

// Sections and settings slide (or cross-fade) when one above them changes height, e.g. the accent row appearing
function Section({ title, children }: { title: string; children: ReactNode }) {
  const { colors } = useTheme();
  const layout = useLayoutTransition();
  return (
    <Animated.View layout={layout} style={styles.section}>
      <Text accessibilityRole="header" style={[styles.sectionTitle, { color: colors.textSecondary }]}>
        {title}
      </Text>
      {children}
    </Animated.View>
  );
}

/** A labelled control that sits under its label rather than beside it. */
function Setting({ label, caption, children }: { label: string; caption?: string; children: ReactNode }) {
  const { colors } = useTheme();
  const layout = useLayoutTransition();
  return (
    <Animated.View layout={layout} style={styles.setting}>
      <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>{label}</Text>
      {caption && <Text style={[styles.note, { color: colors.textSecondary }]}>{caption}</Text>}
      {children}
    </Animated.View>
  );
}
