import { currencyExponent } from '@/domain/money/money.format';
import type { AmountIncrement, DragSensitivity } from '@/storage/preferences/preferences';

/*
 * How the amount drag feels, as numbers (PHASES-2, Phase 2). Tune these, not the code.
 *
 * - Slow drag (finger under PRECISE_SPEED): exactly one step per `pixelsPerStep` of travel, every time.
 *   Balanced: 9 pt per step, so 5 steps = 45 pt, 40 steps = 360 pt.
 * - Faster drags multiply that, easing in, up to MAX_GAIN at FAST_SPEED: about ×3.5 at 1000 pt/s and ×16 at a flick,
 *   so 100 steps take ~260 pt at a brisk 1000 pt/s and ~56 pt at a flick.
 * - Slowing down returns to one step per `pixelsPerStep` immediately: gain follows the current speed, nothing carries over.
 * - Movement made before the gesture activates never counts; release commits exactly what is shown.
 * - At 0 and at the maximum the number resists: further pull moves it at most RUBBER_MAX_PT, then it springs back.
 */

/** Below this finger speed (pt/s), the drag is at its finest: one step per `pixelsPerStep`. */
export const PRECISE_SPEED = 300;
/** At and above this speed (pt/s), the drag moves at MAX_GAIN. */
export const FAST_SPEED = 2000;
export const MAX_GAIN = 16;
/** How far the number can be pulled past 0 or the maximum, and how quickly it stiffens. */
export const RUBBER_MAX_PT = 20;
const RUBBER_SCALE_PT = 60;
/** Float tolerance so travel in many small events adds up to whole steps. */
const EPSILON = 1e-9;

export type DragConfig = {
  /** Finger travel (pt) per step at precise speed. */
  pixelsPerStep: number;
  stepMinor: number;
  maxAmountMinor: number;
};

/** Finger travel per step: more travel = finer control. */
const PIXELS_PER_STEP: Record<DragSensitivity, number> = { precise: 14, balanced: 9, fast: 6 };

/** The smallest drag step: one major unit; zero-decimal currencies (JPY, KRW) have small units, so 10. */
export function baseStepMinor(currencyCode: string): number {
  const exponent = currencyExponent(currencyCode);
  return exponent === 0 ? 10 : Math.pow(10, exponent);
}

export function dragConfigFor(
  currencyCode: string,
  { sensitivity = 'balanced', increment = 1 }: { sensitivity?: DragSensitivity; increment?: AmountIncrement } = {},
): DragConfig {
  const exponent = currencyExponent(currencyCode);
  return {
    pixelsPerStep: PIXELS_PER_STEP[sensitivity],
    stepMinor: baseStepMinor(currencyCode) * increment,
    maxAmountMinor: exponent === 0 ? 10_000_000 : 100_000 * Math.pow(10, exponent),
  };
}

/** Steps per `pixelsPerStep` of travel at this finger speed (pt/s, either direction). */
export function speedGain(speed: number): number {
  'worklet';
  const t = Math.min(Math.max((Math.abs(speed) - PRECISE_SPEED) / (FAST_SPEED - PRECISE_SPEED), 0), 1);
  return 1 + (MAX_GAIN - 1) * t * t;
}

export type DragState = {
  amountMinor: number;
  /** Fraction of a step travelled but not yet applied (signed: positive = up). */
  progress: number;
  /** Travel (pt) pulled past 0 (negative) or the maximum (positive). */
  overscroll: number;
};

export function startDrag(amountMinor: number): DragState {
  'worklet';
  return { amountMinor, progress: 0, overscroll: 0 };
}

export type DragUpdate = {
  state: DragState;
  /** The amount changed. */
  stepped: boolean;
  /** The amount just reached 0 or the maximum. */
  hitEdge: boolean;
};

/** `steps` grid steps from `amountMinor`; an off-grid amount (typed on the keypad) first snaps to the grid. */
function stepFrom(amountMinor: number, steps: number, stepMinor: number) {
  'worklet';
  const base = steps > 0 ? Math.floor(amountMinor / stepMinor) : Math.ceil(amountMinor / stepMinor);
  return (base + steps) * stepMinor;
}

/**
 * Applies one movement of the finger. `dy` is the change in the gesture's translationY since the last update
 * (negative = up = increase), `speed` the finger's current vertical speed. Runs on the UI thread every frame.
 */
export function advanceDrag(state: DragState, dy: number, speed: number, config: DragConfig): DragUpdate {
  'worklet';
  let { amountMinor, progress, overscroll } = state;
  let up = -dy;
  const unchanged = (next: DragState): DragUpdate => ({ state: next, stepped: false, hitEdge: false });

  // Pulled past an edge: moving back first undoes the pull
  if (overscroll !== 0 && up !== 0 && Math.sign(up) !== Math.sign(overscroll)) {
    const back = Math.min(Math.abs(up), Math.abs(overscroll)) * Math.sign(up);
    overscroll += back;
    up -= back;
  }
  if (up === 0) return unchanged({ amountMinor, progress, overscroll });

  // At an edge and pushing further: the number resists instead of moving
  if ((up > 0 && amountMinor >= config.maxAmountMinor) || (up < 0 && amountMinor <= 0)) {
    return unchanged({ amountMinor, progress: 0, overscroll: overscroll + up });
  }

  progress += (up / config.pixelsPerStep) * speedGain(speed);
  const steps = Math.trunc(progress + Math.sign(progress) * EPSILON);
  if (steps === 0) return unchanged({ amountMinor, progress, overscroll });

  progress -= steps;
  const next = Math.min(Math.max(stepFrom(amountMinor, steps, config.stepMinor), 0), config.maxAmountMinor);
  const hitEdge = next === 0 || next === config.maxAmountMinor;
  return {
    state: { amountMinor: next, progress: hitEdge ? 0 : progress, overscroll },
    stepped: next !== amountMinor,
    hitEdge,
  };
}

/** How far the number visibly moves (pt, negative = up) for a pull past an edge: stiffer the further it goes. */
export function rubberBand(overscroll: number): number {
  'worklet';
  return -Math.sign(overscroll) * RUBBER_MAX_PT * (1 - Math.exp(-Math.abs(overscroll) / RUBBER_SCALE_PT));
}

export function clampAmount(amountMinor: number, config: DragConfig): number {
  return Math.min(Math.max(amountMinor, 0), config.maxAmountMinor);
}
