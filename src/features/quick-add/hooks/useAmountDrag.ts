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
import { Duration, Springs } from '@/animation/tokens';
import { settleTo } from '@/animation/transitions';
import { haptics } from '@/haptics/haptics.service';

import { advanceDrag, rubberBand, speedGain, startDrag, type DragConfig, type DragState } from '../utils/dragMapping';

type UseAmountDragOptions = {
  /** Displayed amount (minor units). Written every frame on the UI thread, never through React state. */
  amount: SharedValue<number>;
  config: DragConfig;
  enabled: boolean;
  onDragStart: () => void;
  /** Called once per drag with the final amount; this is the only point where React state changes. */
  onDragEnd: (amountMinor: number) => void;
};

export function useAmountDrag({ amount, config, enabled, onDragStart, onDragEnd }: UseAmountDragOptions) {
  const reducedMotion = useReducedMotion();
  const drag = useSharedValue<DragState>(startDrag(0));
  /** translationY at the previous update: each update applies only the new movement. */
  const lastTranslation = useSharedValue(0);
  /** Steps since the last haptic tick. */
  const untickedSteps = useSharedValue(0);
  const active = useSharedValue(false);
  /** Tiny bump on each step so the digits feel physical. */
  const pulse = useSharedValue(1);
  /** How far the number is pulled past 0 or the maximum (pt). */
  const edgeOffset = useSharedValue(0);

  const gesture = Gesture.Pan()
    .enabled(enabled)
    // Vertical only: let horizontal swipes and scroll keep their gestures
    .activeOffsetY([-6, 6])
    .failOffsetX([-24, 24])
    .onStart((event) => {
      cancelAnimation(amount);
      cancelAnimation(edgeOffset);
      // The travel that activated the gesture is not counted: no jump on activation
      lastTranslation.set(event.translationY);
      // An amount mid-animation (e.g. after a keypad entry) continues from a whole minor unit
      const from = Math.round(amount.get());
      amount.set(from);
      drag.set(startDrag(from));
      untickedSteps.set(0);
      active.set(true);
      scheduleOnRN(onDragStart);
    })
    .onUpdate((event) => {
      if (!active.get()) return;
      const dy = event.translationY - lastTranslation.get();
      lastTranslation.set(event.translationY);
      const previous = drag.get().amountMinor;
      const update = advanceDrag(drag.get(), dy, event.velocityY, config);
      drag.set(update.state);
      if (!reducedMotion) edgeOffset.set(rubberBand(update.state.overscroll));
      if (!update.stepped) return;

      amount.set(update.state.amountMinor);
      if (!reducedMotion) pulse.set(withSequence(withTiming(1.04, { duration: Duration.tick }), withSpring(1, Springs.press)));
      // One tick per step when slow; when fast, one per `pixelsPerStep` of finger travel, so it never buzzes
      untickedSteps.set(untickedSteps.get() + Math.abs(update.state.amountMinor - previous) / config.stepMinor);
      if (update.hitEdge) {
        untickedSteps.set(0);
        scheduleOnRN(haptics.edge);
      } else if (untickedSteps.get() >= speedGain(event.velocityY) - 1e-9) {
        untickedSteps.set(0);
        scheduleOnRN(haptics.tick);
      }
    })
    // Also runs when the system cancels the gesture: always commit what the user sees
    .onFinalize(() => {
      if (!active.get()) return;
      active.set(false);
      edgeOffset.set(settleTo(0, reducedMotion));
      scheduleOnRN(onDragEnd, drag.get().amountMinor);
    });

  return { gesture, pulse, edgeOffset };
}
