import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Keyboard, Switch, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { fade, useEnterTransition } from '@/animation/transitions';
import { Button } from '@/components/Button';
import { ErrorBanner } from '@/components/ErrorBanner';
import { Icon } from '@/components/Icon';
import { ListRow } from '@/components/ListRow';
import { Screen } from '@/components/Screen';
import { Swatch } from '@/components/Swatch';
import { TextField } from '@/components/TextField';
import { categoryRepository } from '@/domain/category/category.repository';
import {
  createCategory,
  editCategory,
  MAX_CATEGORY_NAME_LENGTH,
  validateCategoryName,
  type CategoryInput,
} from '@/domain/category/category.service';
import { CategoryIcons } from '@/domain/category/category.types';
import { categoryDisplayName } from '@/domain/category/categoryName';
import { useCategories } from '@/features/categories/hooks/useCategories';
import { useTheme } from '@/theme/ThemeProvider';
import type { CategoryColorToken } from '@/theme/tokens';
import { EdgeToEdge } from '@/theme/tokens';
import { writeFailureMessage } from '@/storage/database/errors';
import { t, type MessageKey } from '@/i18n';

import { styles } from './styles';

type Form = CategoryInput & { isVisible: boolean };

/** Add (`id` = "new") or edit a category: name, icon, color, visibility. */
export function CategoryEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const { colors, categoryColors, style } = useTheme();
  const entering = useEnterTransition();
  // Stored names: the form shows the display name, but an untouched name field must save the stored one unchanged
  const categories = useCategories({ displayNames: false });
  const existing = categories.find((category) => category.id === id);
  const displayName = existing ? categoryDisplayName(existing) : '';

  const [form, setForm] = useState<Form | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Categories load asynchronously: start the form once the category is known
  if (!form && (isNew || existing)) {
    setForm(
      existing
        ? { name: displayName, icon: existing.icon, colorToken: existing.colorToken, isVisible: existing.isVisible }
        : { name: '', icon: 'other', colorToken: 'neutral', isVisible: true },
    );
  }

  const title = isNew ? t('categories.editor.newTitle') : t('categories.editor.editTitle');
  if (!form) return <Screen edges={['bottom']}>{<Stack.Screen options={{ title }} />}</Screen>;

  const nameError = validateCategoryName(form.name);
  const visibleCount = categories.filter((category) => category.isVisible).length;
  // Quick Add needs at least one category to pick from
  const lastVisible = !isNew && existing?.isVisible === true && visibleCount <= 1;
  const tint = categoryColors[form.colorToken];

  const save = async () => {
    if (nameError || saving) return;
    Keyboard.dismiss();
    setSaving(true);
    setError(null);
    try {
      const name = existing && form.name.trim() === displayName ? existing.name : form.name;
      const input = { name, icon: form.icon, colorToken: form.colorToken };
      if (existing) {
        await categoryRepository.update({ ...editCategory(existing, input), isVisible: form.isVisible });
      } else {
        await categoryRepository.add({ ...createCategory(input, categories.length), isVisible: form.isVisible });
      }
      router.back();
    } catch (error) {
      setError(writeFailureMessage(error, t('categories.editor.saveFailed')));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title }} />
      <KeyboardAwareScrollView
        bottomOffset={24}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        style={EdgeToEdge.scroll}
        contentContainerStyle={[styles.content, EdgeToEdge.content]}>
        <Animated.View entering={entering} style={styles.sections}>
          {/* Live preview of the tile; keyed so icon/color changes cross-fade */}
          <View style={styles.previewSlot} accessible accessibilityLabel={t('categories.editor.preview', { name: form.name || t('categories.editor.unnamed') })}>
            <Animated.View
              key={`${form.icon}-${form.colorToken}`}
              {...fade}
              style={[styles.preview, { backgroundColor: colors.surfaceSecondary }]}>
              <Icon name={form.icon} color={tint} size={28} />
            </Animated.View>
          </View>

          <TextField
            accessibilityLabel={t('categories.editor.nameLabel')}
            placeholder={t('categories.editor.namePlaceholder')}
            value={form.name}
            onChangeText={(name) => setForm({ ...form, name })}
            maxLength={MAX_CATEGORY_NAME_LENGTH}
            autoCapitalize="words"
            returnKeyType="done"
          />

          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t('categories.editor.icon')}</Text>
          <View accessibilityRole="radiogroup" accessibilityLabel={t('categories.editor.icon')} style={styles.grid}>
            {CategoryIcons.map((icon) => (
              <Swatch
                key={icon}
                accessibilityLabel={t(`categories.icon.${icon}` as MessageKey)}
                selected={form.icon === icon}
                onPress={() => setForm({ ...form, icon })}>
                <Icon name={icon} color={tint} size={20} />
              </Swatch>
            ))}
          </View>

          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t('categories.editor.color')}</Text>
          {/* Black & White shows no category colors, so there is nothing to pick; the stored color is kept for Color */}
          {style === 'mono' ? (
            <Text style={[styles.note, { color: colors.textSecondary }]}>{t('categories.editor.colorMonoNote')}</Text>
          ) : (
            <View accessibilityRole="radiogroup" accessibilityLabel={t('categories.editor.color')} style={styles.grid}>
              {(Object.keys(categoryColors) as CategoryColorToken[]).map((token) => (
                <Swatch
                  key={token}
                  accessibilityLabel={t(`categories.color.${token}` as MessageKey)}
                  color={categoryColors[token]}
                  selected={form.colorToken === token}
                  onPress={() => setForm({ ...form, colorToken: token })}
                />
              ))}
            </View>
          )}

          <ListRow
            label={t('categories.editor.showInQuickAdd')}
            caption={lastVisible ? t('categories.editor.lastVisible') : undefined}
            accessory={
              <Switch
                accessibilityLabel={t('categories.editor.showInQuickAdd')}
                value={form.isVisible}
                disabled={lastVisible}
                onValueChange={(isVisible) => setForm({ ...form, isVisible })}
                trackColor={{ true: colors.success, false: colors.borderSubtle }}
                thumbColor={colors.surface}
                ios_backgroundColor={colors.borderSubtle}
              />
            }
          />

          {existing?.isBuiltIn && (
            <Text style={[styles.note, { color: colors.textSecondary }]}>
              {t('categories.editor.builtInNote')}
            </Text>
          )}

          {error && (
            <ErrorBanner message={error} />
          )}

          <Button
            label={isNew ? t('categories.editor.add') : t('categories.editor.save')}
            disabled={!!nameError || saving}
            accessibilityHint={nameError ?? undefined}
            onPress={save}
          />
        </Animated.View>
      </KeyboardAwareScrollView>
    </Screen>
  );
}
