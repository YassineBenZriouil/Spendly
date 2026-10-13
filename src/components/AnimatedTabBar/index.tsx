import type { Tabs } from 'expo-router';
import { useEffect, useState, type ComponentProps, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useReducedMotion } from '@/animation/reducedMotion';
import { ReducedTiming, Springs } from '@/animation/tokens';
import { settleTo } from '@/animation/transitions';
import { useTheme } from '@/theme/ThemeProvider';
import { FontScaleCap } from '@/theme/tokens';

import { styles } from './styles';

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

/** Tab bar with a sliding selection pill and animated icons/labels. */
export function AnimatedTabBar({ state, descriptors, navigation, insets }: TabBarProps) {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const [rowWidth, setRowWidth] = useState(0);
  const tabWidth = rowWidth / state.routes.length;

  const position = useSharedValue(state.index);
  const indicatorOpacity = useSharedValue(1);

  useEffect(() => {
    if (reducedMotion) {
      // No sliding: the pill fades in at its new place
      position.set(state.index);
      indicatorOpacity.set(withSequence(withTiming(0, { duration: 0 }), withTiming(1, ReducedTiming)));
    } else {
      position.set(withSpring(state.index, Springs.settle));
    }
  }, [state.index, reducedMotion, position, indicatorOpacity]);

  const indicatorStyle = useAnimatedStyle(() => ({
    width: tabWidth,
    opacity: indicatorOpacity.get(),
    transform: [{ translateX: position.get() * tabWidth }],
  }));

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: colors.surface,
          borderTopColor: colors.borderSubtle,
          paddingBottom: insets.bottom,
        },
      ]}>
      <View
        accessibilityRole="tablist"
        style={styles.row}
        onLayout={(e) => setRowWidth(e.nativeEvent.layout.width)}>
        <Animated.View style={[styles.indicator, indicatorStyle]}>
          <View style={[styles.pill, { backgroundColor: colors.surfaceSecondary }]} />
        </Animated.View>

        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const focused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
          };

          return (
            <TabItem
              key={route.key}
              label={options.title ?? route.name}
              focused={focused}
              onPress={onPress}
              onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
              icon={options.tabBarIcon?.({ focused, color: colors.textPrimary, size: 24 })}
            />
          );
        })}
      </View>
    </View>
  );
}

type TabItemProps = {
  label: string;
  focused: boolean;
  icon: ReactNode;
  onPress: () => void;
  onLongPress: () => void;
};

function TabItem({ label, focused, icon, onPress, onLongPress }: TabItemProps) {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(focused ? 1 : 0);
  const pressed = useSharedValue(0);

  useEffect(() => {
    progress.set(settleTo(focused ? 1 : 0, reducedMotion));
  }, [focused, reducedMotion, progress]);

  const itemStyle = useAnimatedStyle(() => ({
    transform: [{ scale: reducedMotion ? 1 : interpolate(pressed.get(), [0, 1], [1, 0.92]) }],
    opacity: reducedMotion ? interpolate(pressed.get(), [0, 1], [1, 0.6]) : 1,
  }));

  const iconStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.get(), [0, 1], [0.5, 1]),
    transform: reducedMotion
      ? []
      : [
          { scale: interpolate(progress.get(), [0, 1], [1, 1.12]) },
          { translateY: interpolate(progress.get(), [0, 1], [0, -1]) },
        ],
  }));

  const labelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(progress.get(), [0, 1], [colors.textSecondary, colors.textPrimary]),
  }));

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={() => pressed.set(settleTo(1, reducedMotion))}
      onPressOut={() => pressed.set(settleTo(0, reducedMotion))}
      style={styles.item}>
      <Animated.View style={[styles.itemContent, itemStyle]}>
        <Animated.View style={iconStyle}>{icon}</Animated.View>
        <Animated.Text maxFontSizeMultiplier={FontScaleCap.tight} style={[styles.label, labelStyle]}>{label}</Animated.Text>
      </Animated.View>
    </Pressable>
  );
}
