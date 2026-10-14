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

import { styles } from './styles';

const failed = (action: string) => (error: unknown) =>
  Alert.alert(`Couldn't ${action}`, writeFailureMessage(error, 'Nothing was changed. Try again.'));

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
      .then(() => AccessibilityInfo.announceForAccessibility(`${category.name}, position ${next.indexOf(category.id) + 1} of ${next.length}`))
      .catch(failed('reorder'));
  };

  const restoreDefaults = () => {
    Alert.alert(
      'Restore default categories?',
      'Built-in categories get their original names, icons, colors and order back, and are shown again. Your own categories are kept.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          style: 'destructive',
          onPress: () => categoryRepository.restoreDefaults().catch(failed('restore defaults')),
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
          Hold a category and drag to reorder. Hidden categories disappear from Quick Add; expenses already in them keep showing their category.
        </Text>

        <Animated.View entering={entering}>
          <SortableList
            items={categories}
            onReorder={(next) => categoryRepository.reorder(next).catch(failed('reorder'))}
            renderItem={(category) => {
              const index = ids.indexOf(category.id);
              return (
                <ListRow
                  icon={category.icon}
                  iconColor={categoryColors[category.colorToken]}
                  label={category.name}
                  caption={category.isVisible ? undefined : 'Hidden from Quick Add'}
                  accessibilityHint="Opens the category to rename, restyle or hide it"
                  onPress={() => router.push({ pathname: '/categories/[id]', params: { id: category.id } })}
                  // Screen-reader alternative to dragging
                  accessibilityActions={[
                    ...(index > 0 ? [{ name: 'moveUp', label: 'Move up' }] : []),
                    ...(index < ids.length - 1 ? [{ name: 'moveDown', label: 'Move down' }] : []),
                  ]}
                  onAccessibilityAction={(event) => move(category, event.nativeEvent.actionName === 'moveUp' ? -1 : 1)}
                />
              );
            }}
          />
        </Animated.View>

        <View style={styles.actions}>
          <Button label="Add category" onPress={() => router.push({ pathname: '/categories/[id]', params: { id: 'new' } })} />
          <Button label="Restore defaults" variant="secondary" onPress={restoreDefaults} />
        </View>
      </ScrollView>
    </Screen>
  );
}
