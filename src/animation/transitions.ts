import { FadeIn, FadeInDown, FadeOut, FadingTransition, LinearTransition, withSpring, withTiming } from 'react-native-reanimated';

import { useReducedMotion } from './reducedMotion';
import { Duration, ReducedTiming, Springs } from './tokens';

/**
 * Short opacity-only fade for content appearing/disappearing in place. Runs even under reduced motion
 * (it has no movement), so it is also the reduced-motion replacement for slides and scales.
 */
export const fade = {
  entering: FadeIn.duration(ReducedTiming.duration).reduceMotion(ReducedTiming.reduceMotion),
  exiting: FadeOut.duration(ReducedTiming.duration).reduceMotion(ReducedTiming.reduceMotion),
};

/** Animate a shared value to `value`: spring normally, short timing under reduced motion. */
export function settleTo(value: number, reducedMotion: boolean) {
  'worklet';
  return reducedMotion ? withTiming(value, ReducedTiming) : withSpring(value, Springs.settle);
}

/** `entering` animation for content appearing on screen. */
export function useEnterTransition() {
  const reducedMotion = useReducedMotion();
  return reducedMotion ? fade.entering : FadeInDown.duration(Duration.standard);
}

/**
 * `layout` animation for items that move when their neighbours change (a row added or removed, a bar re-sorted, a
 * button resizing): they slide; with reduced motion they cross-fade into place instead of sliding or snapping.
 */
export function useLayoutTransition() {
  const reducedMotion = useReducedMotion();
  return reducedMotion
    ? FadingTransition.duration(ReducedTiming.duration).reduceMotion(ReducedTiming.reduceMotion)
    : LinearTransition.duration(Duration.standard);
}
