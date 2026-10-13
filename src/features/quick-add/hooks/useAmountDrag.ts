import { Gesture } from 'react-native-gesture-handler';
import {
  cancelAnimation,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useReducedMotion } from '@/animation/reducedMotion';
import { Springs } from '@/animation/tokens';
import { haptics } from '@/haptics/haptics.service';

import { amountFromDrag, type DragConfig } from '../utils/dragMapping';

type UseAmountDragOptions = {
  /** Displayed amount (minor units). Written every frame on the UI thread, never through React state. */
  amount: SharedValue<number>;
  config: DragConfig;
  enabled: boolean;
  onDragStart: () => void;
  /** Called once per drag with the final amount; this is the only point where React state changes. */
  onDragEnd: (amountMinor: number) => void;
};

/** Haptic every 10 steps: sparse enough to stay meaningful. */
const STEPS_PER_TICK = 10;

export function useAmountDrag({ amount, config, enabled, onDragStart, onDragEnd }: UseAmountDragOptions) {
  const reducedMotion = useReducedMotion();
  const startAmount = useSharedValue(0);
  const lastTick = useSharedValue(0);
  const active = useSharedValue(false);
  /** Tiny bump on each step so the digits feel physical. */
  const pulse = useSharedValue(1);
  const tickSize = config.stepMinor * STEPS_PER_TICK;

  const gesture = Gesture.Pan()
    .enabled(enabled)
    // Vertical only: let horizontal swipes and scroll keep their gestures
    .activeOffsetY([-6, 6])
    .failOffsetX([-24, 24])
    .onStart(() => {
      cancelAnimation(amount);
      active.set(true);
      startAmount.set(amount.get());
      lastTick.set(Math.floor(amount.get() / tickSize));
      scheduleOnRN(onDragStart);
    })
    .onUpdate((event) => {
      const next = amountFromDrag(startAmount.get(), event.translationY, config);
      if (next === amount.get()) return;
      amount.set(next);
      if (!reducedMotion) pulse.set(withSequence(withTiming(1.04, { duration: 40 }), withSpring(1, Springs.press)));
      const tick = Math.floor(next / tickSize);
      if (tick !== lastTick.get()) {
        lastTick.set(tick);
        scheduleOnRN(haptics.tick);
      }
    })
    // Also runs when the system cancels the gesture: always commit what the user sees
    .onFinalize(() => {
      if (!active.get()) return;
      active.set(false);
      scheduleOnRN(onDragEnd, amount.get());
    });

  return { gesture, pulse };
}
