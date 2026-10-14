import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  FadeInDown,
  interpolate,
  interpolateColor,
  useAnimatedRef,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  type AnimatedRef,
} from 'react-native-reanimated';

import { useReducedMotion } from '@/animation/reducedMotion';
import { Duration, Stagger } from '@/animation/tokens';
import { fade, settleTo } from '@/animation/transitions';
import { Icon } from '@/components/Icon';
import type { ExpenseCategory } from '@/domain/category/category.types';
import { useTheme } from '@/theme/ThemeProvider';
import { FontScaleCap } from '@/theme/tokens';
import { t } from '@/i18n';

import { styles } from './styles';

type CategoryTileProps = {
  category: ExpenseCategory;
  index: number;
  selected: boolean;
  /** Another tile is selected: this one steps back. */
  dimmed: boolean;
  /** Distance (in tiles) from the selected tile, for the stagger. */
  staggerIndex: number;
  onSelect: (category: ExpenseCategory, tileRef: AnimatedRef<View>) => void;
  onLongPress?: () => void;
};

export function CategoryTile({
  category,
  index,
  selected,
  dimmed,
  staggerIndex,
  onSelect,
  onLongPress,
}: CategoryTileProps) {
  const { colors, categoryColors } = useTheme();
  const reducedMotion = useReducedMotion();
  const tileRef = useAnimatedRef<View>();
  const selection = useSharedValue(selected ? 1 : 0);
  const dim = useSharedValue(dimmed ? 1 : 0);
  const pressed = useSharedValue(0);
  const tint = categoryColors[category.colorToken];

  useEffect(() => {
    selection.set(settleTo(selected ? 1 : 0, reducedMotion));
  }, [selected, reducedMotion, selection]);

  useEffect(() => {
    dim.set(withDelay(reducedMotion ? 0 : staggerIndex * Stagger, settleTo(dimmed ? 1 : 0, reducedMotion)));
  }, [dimmed, staggerIndex, reducedMotion, dim]);

  const tileStyle = useAnimatedStyle(() => {
    // Selected: outline and a small lift; others step back by fading; press dims. No scaling: the icon inside a
    // scaled tile is shown stretched (blurry) until it is redrawn
    return {
      opacity: interpolate(dim.get(), [0, 1], [1, 0.5]) * interpolate(pressed.get(), [0, 1], [1, 0.7]),
      borderColor: interpolateColor(selection.get(), [0, 1], ['transparent', colors.textPrimary]),
      transform: reducedMotion ? [] : [{ translateY: interpolate(selection.get(), [0, 1], [0, -3]) }],
    };
  });

  const entering = reducedMotion
    ? fade.entering
    : FadeInDown.duration(Duration.standard).delay(index * Stagger);

  return (
    <Animated.View entering={entering} style={styles.cell}>
      <Pressable
        accessibilityRole="radio"
        accessibilityLabel={category.name}
        accessibilityState={{ checked: selected }}
        accessibilityHint={onLongPress ? t('quickAdd.categoryTile.manageHint') : undefined}
        onPress={() => onSelect(category, tileRef)}
        onLongPress={onLongPress}
        onPressIn={() => pressed.set(settleTo(1, reducedMotion))}
        onPressOut={() => pressed.set(settleTo(0, reducedMotion))}>
        <Animated.View
          ref={tileRef}
          style={[styles.tile, { backgroundColor: colors.surfaceSecondary }, tileStyle]}>
          <Icon name={category.icon} color={tint} size={24} />
          <Animated.Text
            maxFontSizeMultiplier={FontScaleCap.tight}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
            style={[styles.label, { color: colors.textPrimary }]}>
            {category.name}
          </Animated.Text>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}
