import { router } from 'expo-router';
import { useState } from 'react';
import { AccessibilityInfo, Keyboard, Text, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import Animated from 'react-native-reanimated';

import { useEnterTransition } from '@/animation/transitions';
import { Button } from '@/components/Button';
import { ErrorBanner } from '@/components/ErrorBanner';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import type { Budget } from '@/domain/budget/budget';
import { minorToDecimal } from '@/domain/export/csv';
import { currencyExponent } from '@/domain/money/money.format';
import { parseTypedAmount } from '@/domain/money/money.parse';
import { useCategories } from '@/features/categories/hooks/useCategories';
import { t } from '@/i18n';
import { getPreferences, updatePreferences, usePreferences, usePreferencesSaveError } from '@/storage/preferences/preferences';
import { useTheme } from '@/theme/ThemeProvider';
import { EdgeToEdge } from '@/theme/tokens';

import { styles } from './styles';

/** Field texts: the overall amount under `''`, categories under their id. */
type Fields = Record<string, string>;
const OVERALL = '';

/** The stored budget as editable text, only when it is in the current currency (other amounts would mean nothing). */
function fieldsFrom(budget: Budget | undefined, currencyCode: string): Fields {
  if (!budget || budget.currencyCode !== currencyCode) return {};
  const exponent = currencyExponent(currencyCode);
  const text = (minor: number) => minorToDecimal(minor, exponent);
  return {
    ...(budget.monthlyMinor ? { [OVERALL]: text(budget.monthlyMinor) } : {}),
    ...Object.fromEntries(Object.entries(budget.byCategory).map(([id, minor]) => [id, text(minor)])),
  };
}

/** Monthly budgets in the main currency: overall and per category, all optional. Only Insights shows them. */
export function BudgetScreen() {
  const { colors } = useTheme();
  const entering = useEnterTransition();
  const { currencyCode, budget } = usePreferences();
  const saveError = usePreferencesSaveError();
  const categories = useCategories().filter((category) => category.isVisible || budget?.byCategory[category.id]);
  const [fields, setFields] = useState<Fields>(() => fieldsFrom(getPreferences().budget, getPreferences().currencyCode));
  const [invalid, setInvalid] = useState<string[]>([]);
  const exponent = currencyExponent(currencyCode);

  const save = () => {
    Keyboard.dismiss();
    const amounts = Object.entries(fields)
      .filter(([, text]) => text.trim() !== '')
      .map(([id, text]) => [id, parseTypedAmount(text, exponent)] as const);
    const bad = amounts.filter(([, minor]) => minor === null).map(([id]) => id);
    setInvalid(bad);
    if (bad.length > 0) return;
    const { [OVERALL]: monthlyMinor, ...byCategory } = Object.fromEntries(amounts) as Record<string, number>;
    const next: Budget | undefined =
      monthlyMinor || Object.keys(byCategory).length > 0
        ? { currencyCode, ...(monthlyMinor ? { monthlyMinor } : {}), byCategory }
        : undefined;
    // Saved at once; a failed write keeps the screen open with the reason
    if (!updatePreferences({ budget: next })) return;
    AccessibilityInfo.announceForAccessibility(t(next ? 'settings.budget.saved' : 'settings.budget.removed'));
    router.back();
  };

  const field = (id: string, label: string) => (
    <View style={styles.amount}>
      <TextField
        accessibilityLabel={t('settings.budget.fieldLabel', { name: label, currency: currencyCode })}
        placeholder={currencyCode}
        keyboardType="decimal-pad"
        clearable
        value={fields[id] ?? ''}
        onChangeText={(text) => setFields({ ...fields, [id]: text })}
      />
    </View>
  );

  const nameOf = (id: string) => (id === OVERALL ? t('settings.budget.overall') : categories.find((c) => c.id === id)?.name ?? id);

  return (
    <Screen edges={['bottom']}>
      <KeyboardAwareScrollView
        bottomOffset={24}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
        style={EdgeToEdge.scroll}
        contentContainerStyle={[styles.content, EdgeToEdge.content]}>
        <Animated.View entering={entering} style={styles.sections}>
          <View style={styles.section}>
            <Text style={[styles.note, { color: colors.textSecondary }]}>{t('settings.budget.note', { currency: currencyCode })}</Text>
            {budget && budget.currencyCode !== currencyCode && (
              <Text style={[styles.note, { color: colors.textSecondary }]}>
                {t('settings.budget.otherCurrency', { old: budget.currencyCode, currency: currencyCode })}
              </Text>
            )}
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t('settings.budget.section.month')}</Text>
            <View style={styles.row}>
              <Text style={[styles.name, { color: colors.textPrimary }]}>{t('settings.budget.overall')}</Text>
              {field(OVERALL, t('settings.budget.overall'))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t('settings.budget.section.categories')}</Text>
            {categories.map((category) => (
              <View key={category.id} style={styles.row}>
                <Icon name={category.icon} color={colors.textSecondary} size={18} />
                <Text style={[styles.name, { color: colors.textPrimary }]}>{category.name}</Text>
                {field(category.id, category.name)}
              </View>
            ))}
          </View>

          {(invalid.length > 0 || saveError) && (
            <ErrorBanner
              message={invalid.length > 0 ? t('settings.budget.invalid', { names: invalid.map(nameOf).join(', ') }) : saveError!}
            />
          )}

          <Button label={t('settings.budget.save')} onPress={save} />
        </Animated.View>
      </KeyboardAwareScrollView>
    </Screen>
  );
}
