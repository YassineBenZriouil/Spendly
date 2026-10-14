import { Easing, ReduceMotion, type WithSpringConfig, type WithTimingConfig } from 'react-native-reanimated';

/** Durations in ms. Starting values from IDENTITY.md §4 — tune on device. */
export const Duration = {
  /** Per-step pulse while dragging the amount: must finish before the next step lands. */
  tick: 40,
  micro: 130,
  quick: 190,
  standard: 270,
  morph: 380,
} as const;

/** Signature category -> composer morph and its reverse. */
export const MorphTiming = {
  duration: Duration.morph,
  easing: Easing.bezier(0.2, 0, 0, 1),
} satisfies WithTimingConfig;

/** Delay between items in a staggered group (e.g. category grid). */
export const Stagger = 30;

export const Springs = {
  /** Drag release and surface settling: low bounce, no toy-like overshoot. */
  settle: { damping: 26, stiffness: 260, mass: 1 },
  /** Press feedback on tactile surfaces. */
  press: { damping: 30, stiffness: 420, mass: 0.8 },
} satisfies Record<string, WithSpringConfig>;

/**
 * Reduced-motion replacement: a short fade/color timing that still runs.
 * `ReduceMotion.Never` because Reanimated would otherwise skip it entirely, and every change must animate.
 */
export const ReducedTiming = {
  duration: Duration.quick,
  reduceMotion: ReduceMotion.Never,
} satisfies WithTimingConfig;
