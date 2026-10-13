import { FadeIn, FadeInDown, withSpring, withTiming } from 'react-native-reanimated';

import { useReducedMotion } from './reducedMotion';
import { Duration, ReducedTiming, Springs } from './tokens';

/** Animate a shared value to `value`: spring normally, short timing under reduced motion. */
export function settleTo(value: number, reducedMotion: boolean) {
  'worklet';
  return reducedMotion ? withTiming(value, ReducedTiming) : withSpring(value, Springs.settle);
}

/** `entering` animation for content appearing on screen. */
export function useEnterTransition() {
  const reducedMotion = useReducedMotion();
  return reducedMotion
    ? FadeIn.duration(ReducedTiming.duration).reduceMotion(ReducedTiming.reduceMotion)
    : FadeInDown.duration(Duration.standard);
}
