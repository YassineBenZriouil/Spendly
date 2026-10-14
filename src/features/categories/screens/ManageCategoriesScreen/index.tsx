import { router } from 'expo-router';
import { AccessibilityInfo, Alert, Text, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';

import { useEnterTransition } from '@/animation/transitions';
import { Button } from '@/components/Button';
import { ListRow } from '@/components/ListRow';
import { Screen } from '@/components/Screen';
import { SortableList } from '@/components/SortableList';
import { categoryRepository } from '@/domain/category/category.repository';
import { moveCategory } from '@/domain/category/category.service';
import type { ExpenseCategory } from '@/domain/category/category.types';
import { useCategories } from '@/features/categories/hooks/useCategories';
import { useTheme } from '@/theme/ThemeProvider';
import { EdgeToEdge } from '@/theme/tokens';
import { writeFailureMessage } from '@/storage/database/errors';
import { t } from '@/i18n';

import { styles } from './styles';

const failed = (title: string) => (error: unknown) =>
  Alert.alert(title, writeFailureMessage(error, t('common.error.nothingChanged')));

export function ManageCategoriesScreen() {
  const { colors, categoryColors } = useTheme();
  const entering = useEnterTransition();
  const categories = useCategories();
  const ids = categories.map((category) => category.id);

  const move = (category: ExpenseCategory, direction: -1 | 1) => {
    const next = moveCategory(ids, category.id, direction);
    if (!next) return;
    categoryRepository
      .reorder(next)
      .then(() => AccessibilityInfo.announceForAccessibility(
          t('categories.manage.position', {
            name: category.name,
            position: next.indexOf(category.id) + 1,
            total: next.length,
          }),
        ),
      )
      .catch(failed(t('categories.manage.reorderFailed')));
  };

  const restoreDefaults = () => {
    Alert.alert(
      t('categories.manage.restoreTitle'),
      t('categories.manage.restoreMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('categories.manage.restoreButton'),
          style: 'destructive',
          onPress: () => categoryRepository.restoreDefaults().catch(failed(t('categories.manage.restoreFailed'))),
        },
      ],
    );
  };

  return (
    <Screen edges={['bottom']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={EdgeToEdge.scroll}
        contentContainerStyle={[styles.content, EdgeToEdge.content]}>
        <Text style={[styles.note, { color: colors.textSecondary }]}>
          {t('categories.manage.note')}
        </Text>

        <Animated.View entering={entering}>
          <SortableList
            items={categories}
            onReorder={(next) => categoryRepository.reorder(next).catch(failed(t('categories.manage.reorderFailed')))}
            renderItem={(category) => {
              const index = ids.indexOf(category.id);
              return (
                <ListRow
                  icon={category.icon}
                  iconColor={categoryColors[category.colorToken]}
                  label={category.name}
                  caption={category.isVisible ? undefined : t('categories.manage.hidden')}
                  accessibilityHint={t('categories.manage.rowHint')}
                  onPress={() => router.push({ pathname: '/categories/[id]', params: { id: category.id } })}
                  // Screen-reader alternative to dragging
                  accessibilityActions={[
                    ...(index > 0 ? [{ name: 'moveUp', label: t('categories.manage.moveUp') }] : []),
                    ...(index < ids.length - 1 ? [{ name: 'moveDown', label: t('categories.manage.moveDown') }] : []),
                  ]}
                  onAccessibilityAction={(event) => move(category, event.nativeEvent.actionName === 'moveUp' ? -1 : 1)}
                />
              );
            }}
          />
        </Animated.View>

        <View style={styles.actions}>
          <Button label={t('categories.manage.add')} onPress={() => router.push({ pathname: '/categories/[id]', params: { id: 'new' } })} />
          <Button label={t('categories.manage.restoreDefaults')} variant="secondary" onPress={restoreDefaults} />
        </View>
      </ScrollView>
    </Screen>
  );
}
