import { useState } from 'react';
import { AccessibilityInfo, Keyboard, Platform, Share, Text, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import Animated from 'react-native-reanimated';

import { fade, useEnterTransition } from '@/animation/transitions';
import { Button } from '@/components/Button';
import { ErrorBanner } from '@/components/ErrorBanner';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { quickLogLink } from '@/domain/links/addLink';
import { minorToInput, parseTypedAmount } from '@/domain/money/money.parse';
import { currencyExponent, formatMoney } from '@/domain/money/money.format';
import { useCategories } from '@/features/categories/hooks/useCategories';
import { lockStore } from '@/features/lock/state/lockStore';
import { CategoryGrid } from '@/features/quick-add/components/CategoryGrid';
import { t } from '@/i18n';
import { getPreferences, updatePreferences, usePreferences, usePreferencesSaveError } from '@/storage/preferences/preferences';
import { useTheme } from '@/theme/ThemeProvider';
import { EdgeToEdge } from '@/theme/tokens';

import { styles } from './styles';

/**
 * Settings → Shortcuts: set up the Quick log (`spendly://add?quick=1`), which Siri / Shortcuts and the Android quick
 * settings tile save in one step, and share the links. The home-screen widget (Android) needs no setup.
 */
export function ShortcutsScreen() {
  const { colors } = useTheme();
  const entering = useEnterTransition();
  const { currencyCode, quickLog } = usePreferences();
  const saveError = usePreferencesSaveError();
  const categories = useCategories().filter((category) => category.isVisible);
  const exponent = currencyExponent(currencyCode);
  // The form starts from the stored Quick log when it is in the current currency
  const [amountText, setAmountText] = useState(() => {
    const stored = getPreferences().quickLog;
    return stored && stored.currencyCode === getPreferences().currencyCode ? minorToInput(stored.amountMinor, exponent) : '';
  });
  const [categoryId, setCategoryId] = useState<string | null>(() => getPreferences().quickLog?.categoryId ?? null);
  const [invalid, setInvalid] = useState(false);

  const amountMinor = parseTypedAmount(amountText, exponent);
  const category = categories.find((item) => item.id === categoryId);
  const savedCategory = quickLog ? categories.find((item) => item.id === quickLog.categoryId) : undefined;

  const save = () => {
    Keyboard.dismiss();
    setInvalid(amountMinor === null || !category);
    if (amountMinor === null || !category) return;
    if (!updatePreferences({ quickLog: { amountMinor, currencyCode, categoryId: category.id } })) return;
    AccessibilityInfo.announceForAccessibility(
      t('shortcuts.quickLog.saved', { amount: formatMoney(amountMinor, currencyCode), category: category.name }),
    );
  };

  const remove = () => {
    updatePreferences({ quickLog: undefined });
    AccessibilityInfo.announceForAccessibility(t('shortcuts.quickLog.removed'));
  };

  // The share sheet is a system screen opened here: coming back from it doesn't lock the app
  const share = (link: string) => lockStore.withoutLock(() => Share.share({ message: link })).catch(() => undefined);

  const example = 'spendly://add?amount=20&category=Food&save=1';

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
          <Text style={[styles.note, { color: colors.textSecondary }]}>{t('shortcuts.intro')}</Text>

          <View style={styles.section}>
            <Text accessibilityRole="header" style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              {t('shortcuts.quickLog.title')}
            </Text>
            <Text style={[styles.note, { color: colors.textSecondary }]}>{t('shortcuts.quickLog.caption')}</Text>
            {/* Keyed so the current Quick log cross-fades when it changes */}
            <Animated.Text key={quickLog ? `${quickLog.amountMinor}-${quickLog.categoryId}` : 'none'} {...fade} style={[styles.body, { color: colors.textPrimary }]}>
              {quickLog && savedCategory
                ? t('shortcuts.quickLog.current', { amount: formatMoney(quickLog.amountMinor, quickLog.currencyCode), category: savedCategory.name })
                : t('shortcuts.quickLog.none')}
            </Animated.Text>
            <TextField
              accessibilityLabel={t('shortcuts.quickLog.amount', { currency: currencyCode })}
              placeholder={t('shortcuts.quickLog.amount', { currency: currencyCode })}
              keyboardType="decimal-pad"
              clearable
              value={amountText}
              onChangeText={setAmountText}
            />
            <CategoryGrid categories={categories} selectedId={categoryId} onSelect={(picked) => setCategoryId(picked.id)} />
            {(invalid || saveError) && <ErrorBanner message={invalid ? t('shortcuts.quickLog.invalid') : saveError!} />}
            <View style={styles.buttons}>
              <Button label={t('shortcuts.quickLog.save')} onPress={save} />
              {quickLog && (
                <Animated.View {...fade}>
                  <Button label={t('shortcuts.quickLog.remove')} variant="secondary" onPress={remove} />
                </Animated.View>
              )}
            </View>
          </View>

          <View style={styles.section}>
            <Text accessibilityRole="header" style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              {t('shortcuts.links.title')}
            </Text>
            <Text style={[styles.note, { color: colors.textSecondary }]}>
              {Platform.OS === 'ios' ? t('shortcuts.links.ios') : t('shortcuts.links.android')}
            </Text>
            <Text selectable style={[styles.link, { color: colors.textPrimary }]}>
              {quickLogLink()}
            </Text>
            <Button label={t('shortcuts.links.shareQuick')} variant="secondary" onPress={() => share(quickLogLink())} />
            <Text style={[styles.note, { color: colors.textSecondary }]}>{t('shortcuts.links.example')}</Text>
            <Text selectable style={[styles.link, { color: colors.textPrimary }]}>
              {example}
            </Text>
            <Button label={t('shortcuts.links.shareExample')} variant="secondary" onPress={() => share(example)} />
          </View>

          {Platform.OS === 'android' && (
            <View style={styles.section}>
              <Text accessibilityRole="header" style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                {t('shortcuts.android.title')}
              </Text>
              <Text style={[styles.note, { color: colors.textSecondary }]}>{t('shortcuts.android.widget')}</Text>
              <Text style={[styles.note, { color: colors.textSecondary }]}>{t('shortcuts.android.tile')}</Text>
            </View>
          )}
        </Animated.View>
      </KeyboardAwareScrollView>
    </Screen>
  );
}
