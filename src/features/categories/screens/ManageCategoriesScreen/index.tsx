import { router } from 'expo-router';
import { Alert, ScrollView, Text, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';

import { useReducedMotion } from '@/animation/reducedMotion';
import { Duration, ReducedTiming } from '@/animation/tokens';
import { useEnterTransition } from '@/animation/transitions';
import { Button } from '@/components/Button';
import { IconButton } from '@/components/IconButton';
import { ListRow } from '@/components/ListRow';
import { Screen } from '@/components/Screen';
import { categoryRepository } from '@/domain/category/category.repository';
import { moveCategory } from '@/domain/category/category.service';
import { useCategories } from '@/features/categories/hooks/useCategories';
import { useTheme } from '@/theme/ThemeProvider';

import { styles } from './styles';

const failed = (action: string) => Alert.alert(`Couldn't ${action}`, 'Nothing was changed. Try again.');

export function ManageCategoriesScreen() {
  const { colors, categoryColors } = useTheme();
  const entering = useEnterTransition();
  const categories = useCategories();
  const ids = categories.map((category) => category.id);
  const reducedMotion = useReducedMotion();
  // Reordered rows slide to their new place; under reduced motion they fade in there instead (keyed by position)
  const layout = LinearTransition.duration(Duration.standard);
  const reducedEntering = FadeIn.duration(ReducedTiming.duration).reduceMotion(ReducedTiming.reduceMotion);

  const move = (id: string, direction: -1 | 1) => {
    const next = moveCategory(ids, id, direction);
    if (next) categoryRepository.reorder(next).catch(() => failed('reorder'));
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
          onPress: () => categoryRepository.restoreDefaults().catch(() => failed('restore defaults')),
        },
      ],
    );
  };

  return (
    <Screen edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={[styles.note, { color: colors.textSecondary }]}>
          Hidden categories disappear from Quick Add; expenses already in them keep showing their category.
        </Text>

        <Animated.View entering={entering} style={styles.list}>
          {categories.map((category, index) => (
            <Animated.View
              key={reducedMotion ? `${category.id}-${index}` : category.id}
              layout={reducedMotion ? undefined : layout}
              entering={reducedMotion ? reducedEntering : undefined}>
              <ListRow
                icon={category.icon}
                iconColor={categoryColors[category.colorToken]}
                label={category.name}
                caption={category.isVisible ? undefined : 'Hidden from Quick Add'}
                accessibilityHint="Opens the category to rename, restyle or hide it"
                onPress={() => router.push({ pathname: '/categories/[id]', params: { id: category.id } })}
                accessory={
                  <View style={styles.moves}>
                    <IconButton
                      icon="arrowUp"
                      variant="plain"
                      accessibilityLabel={`Move ${category.name} up`}
                      disabled={index === 0}
                      onPress={() => move(category.id, -1)}
                    />
                    <IconButton
                      icon="arrowDown"
                      variant="plain"
                      accessibilityLabel={`Move ${category.name} down`}
                      disabled={index === categories.length - 1}
                      onPress={() => move(category.id, 1)}
                    />
                  </View>
                }
              />
            </Animated.View>
          ))}
        </Animated.View>

        <View style={styles.actions}>
          <Button label="Add category" onPress={() => router.push({ pathname: '/categories/[id]', params: { id: 'new' } })} />
          <Button label="Restore defaults" variant="secondary" onPress={restoreDefaults} />
        </View>
      </ScrollView>
    </Screen>
  );
}
