import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useReducedMotion } from '@/animation/reducedMotion';
import { settleTo } from '@/animation/transitions';
import { haptics } from '@/haptics/haptics.service';
import { useTheme } from '@/theme/ThemeProvider';
import { ListGap, MinTouchTarget, Spacing } from '@/theme/tokens';

import { styles } from './styles';

const GAP = ListGap;
/** Until a row has been measured. */
const ESTIMATED_HEIGHT = MinTouchTarget + Spacing.sm;
const LONG_PRESS_MS = 300;

type SortableListProps<T extends { id: string }> = {
  items: T[];
  renderItem: (item: T) => ReactNode;
  /** Called once per drop that changed the order, with every id in the new order. */
  onReorder: (ids: string[]) => void;
};

type Shared = {
  order: SharedValue<string[]>;
  heights: SharedValue<Record<string, number>>;
  active: SharedValue<string | null>;
  ready: SharedValue<boolean>;
};

function topOf(id: string, order: string[], heights: Record<string, number>) {
  'worklet';
  let y = 0;
  for (const other of order) {
    if (other === id) return y;
    y += (heights[other] ?? ESTIMATED_HEIGHT) + GAP;
  }
  return y;
}

/**
 * Hold a row, then drag it to a new place. Rows are absolutely positioned from the order and their measured
 * heights, so a reorder only moves shared values on the UI thread; nothing re-renders until the drop is stored.
 * Must sit inside a gesture-handler ScrollView so the drag takes over from scrolling.
 * shortcut: no auto-scroll at the list edges; add it if lists grow past one screen.
 */
export function SortableList<T extends { id: string }>({ items, renderItem, onReorder }: SortableListProps<T>) {
  const ids = items.map((item) => item.id);
  const order = useSharedValue(ids);
  const heights = useSharedValue<Record<string, number>>({});
  const active = useSharedValue<string | null>(null);
  const ready = useSharedValue(false);
  const shared = { order, heights, active, ready };

  // Follow the stored order (a drop coming back from the database, restore defaults, a new category)
  useEffect(() => {
    if (active.get() === null) order.set(ids);
  }, [ids, active, order]);

  const containerStyle = useAnimatedStyle(() => {
    const all = order.get();
    const height = all.reduce((sum, id) => sum + (heights.get()[id] ?? ESTIMATED_HEIGHT), 0);
    return { height: height + GAP * Math.max(all.length - 1, 0) };
  });

  return (
    <Animated.View style={containerStyle}>
      {items.map((item) => (
        <SortableRow key={item.id} id={item.id} shared={shared} onReorder={onReorder}>
          {renderItem(item)}
        </SortableRow>
      ))}
    </Animated.View>
  );
}

function SortableRow({
  id,
  shared,
  onReorder,
  children,
}: {
  id: string;
  shared: Shared;
  onReorder: (ids: string[]) => void;
  children: ReactNode;
}) {
  const { order, heights, active, ready } = shared;
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const y = useSharedValue(0);
  const placed = useSharedValue(false);
  const lifted = useSharedValue(0);
  const startY = useSharedValue(0);
  const startOrder = useSharedValue<string[]>([]);

  // Slide to this row's slot whenever the order or a height changes; the dragged row follows the finger instead
  useAnimatedReaction(
    () => (active.get() === id ? null : { top: topOf(id, order.get(), heights.get()), ready: ready.get() }),
    (target) => {
      if (target === null) return;
      const { top } = target;
      // Rows appearing (first show, a new category) are placed directly; only moves animate
      if (!placed.get() || !target.ready) {
        y.set(top);
        placed.set(target.ready);
      } else {
        y.set(settleTo(top, reducedMotion));
      }
    },
  );

  // Merged on the UI thread: rows measure in the same frame, and a JS-side read-modify-write would drop heights
  const measure = (height: number) => {
    heights.modify((value) => {
      'worklet';
      value[id] = height;
      if (!ready.get() && order.get().every((other) => value[other] !== undefined)) ready.set(true);
      return value;
    });
  };

  const pan = Gesture.Pan()
    .activateAfterLongPress(LONG_PRESS_MS)
    .onStart(() => {
      startY.set(y.get());
      startOrder.set(order.get());
      active.set(id);
      lifted.set(settleTo(1, reducedMotion));
      scheduleOnRN(haptics.select);
    })
    .onUpdate((event) => {
      if (active.get() !== id) return;
      y.set(startY.get() + event.translationY);
      // Slot whose midpoint the row has passed, counting only the other rows
      const others = order.get().filter((other) => other !== id);
      let slot = 0;
      let top = 0;
      for (const other of others) {
        const height = (heights.get()[other] ?? ESTIMATED_HEIGHT) + GAP;
        if (y.get() <= top + height / 2) break;
        top += height;
        slot += 1;
      }
      if (order.get()[slot] !== id) {
        order.set([...others.slice(0, slot), id, ...others.slice(slot)]);
        scheduleOnRN(haptics.tick);
      }
    })
    .onFinalize(() => {
      if (active.get() !== id) return;
      // Releasing the row lets the reaction above settle it into its slot from where it was dropped
      active.set(null);
      lifted.set(settleTo(0, reducedMotion));
      const next = order.get();
      if (next.some((other, index) => other !== startOrder.get()[index])) scheduleOnRN(onReorder, next);
    });

  const style = useAnimatedStyle(() => ({
    zIndex: lifted.get() > 0.01 ? 1 : 0,
    shadowOpacity: interpolate(lifted.get(), [0, 1], [0, 0.6]),
    elevation: interpolate(lifted.get(), [0, 1], [0, 6]),
    transform: [{ translateY: y.get() }, { scale: reducedMotion ? 1 : interpolate(lifted.get(), [0, 1], [1, 1.03]) }],
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.row, { shadowColor: colors.overlay }, style]} onLayout={(event) => measure(event.nativeEvent.layout.height)}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
}
