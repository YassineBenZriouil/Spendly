import { useEffect } from 'react';
import type { View } from 'react-native';
import Animated, {
  interpolate,
  measure,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type AnimatedRef,
  type MeasuredDimensions,
} from 'react-native-reanimated';
import { scheduleOnRN, scheduleOnUI } from 'react-native-worklets';

import { useReducedMotion } from '@/animation/reducedMotion';
import { Duration, MorphTiming, ReducedTiming } from '@/animation/tokens';
import { Icon } from '@/components/Icon';
import { useTheme } from '@/theme/ThemeProvider';
import { Radius } from '@/theme/tokens';

import type { MorphChipModel } from '../../hooks/useCategoryMorph';
import { styles } from './styles';

type Rect = { x: number; y: number; width: number; height: number };

const ZERO: Rect = { x: 0, y: 0, width: 0, height: 0 };

function relativeTo(view: MeasuredDimensions, stage: MeasuredDimensions): Rect {
  'worklet';
  return { x: view.pageX - stage.pageX, y: view.pageY - stage.pageY, width: view.width, height: view.height };
}

type MorphChipProps = {
  chip: MorphChipModel;
  stageRef: AnimatedRef<View>;
  anchorRef: AnimatedRef<View>;
  onGone: (key: string) => void;
};

export function MorphChip({ chip, stageRef, anchorRef, onGone }: MorphChipProps) {
  const { colors, categoryColors } = useTheme();
  const reducedMotion = useReducedMotion();
  const from = useSharedValue<Rect>(ZERO);
  const to = useSharedValue<Rect>(ZERO);
  /** 0 = sitting on its tile, 1 = at the anchor. */
  const progress = useSharedValue(0);
  /** Fades the whole chip when another category replaces it. */
  const presence = useSharedValue(1);
  const { tileRef, key, state } = chip;

  // Measure once on the UI thread, then fly tile -> anchor
  useEffect(() => {
    scheduleOnUI(() => {
      'worklet';
      const stage = measure(stageRef);
      const anchor = measure(anchorRef);
      if (!stage || !anchor) return;
      const tile = measure(tileRef);
      to.set(relativeTo(anchor, stage));
      from.set(tile ? relativeTo(tile, stage) : relativeTo(anchor, stage));
      progress.set(withTiming(1, reducedMotion ? ReducedTiming : MorphTiming));
    });
  }, [stageRef, anchorRef, tileRef, from, to, progress, reducedMotion]);

  useEffect(() => {
    const gone = (finished?: boolean) => {
      'worklet';
      if (finished) scheduleOnRN(onGone, key);
    };
    if (state === 'replaced') {
      presence.set(withTiming(0, ReducedTiming, gone));
    } else if (state === 'returning') {
      progress.set(
        withTiming(0, reducedMotion ? ReducedTiming : { ...MorphTiming, duration: Duration.standard }, gone),
      );
    }
  }, [state, key, onGone, presence, progress, reducedMotion]);

  const chipStyle = useAnimatedStyle(() => {
    const p = progress.get();
    const start = from.get();
    const end = to.get();
    // Reduced motion: no flight, the chip fades in/out at the anchor
    const travel = reducedMotion ? 1 : p;
    const visible = reducedMotion ? p : interpolate(p, [0, 0.2], [0, 1], 'clamp');
    return {
      left: start.x + (end.x - start.x) * travel,
      top: start.y + (end.y - start.y) * travel,
      width: start.width + (end.width - start.width) * travel,
      height: start.height + (end.height - start.height) * travel,
      borderRadius: interpolate(travel, [0, 1], [Radius.md, Radius.pill]),
      opacity: visible * presence.get(),
    };
  });

  const contentStyle = useAnimatedStyle(() => ({
    opacity: reducedMotion ? 1 : interpolate(progress.get(), [0.55, 1], [0, 1], 'clamp'),
  }));

  return (
    <Animated.View
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={[styles.chip, { backgroundColor: categoryColors[chip.category.colorToken] }, chipStyle]}>
      <Animated.View style={[styles.content, contentStyle]}>
        <Icon name={chip.category.icon} color={colors.background} size={18} />
        <Animated.Text numberOfLines={1} style={[styles.label, { color: colors.background }]}>
          {chip.category.name}
        </Animated.Text>
      </Animated.View>
    </Animated.View>
  );
}
