import { currencyExponent } from '@/domain/money/money.format';
import type { AmountIncrement, DragSensitivity } from '@/storage/preferences/preferences';

export type DragConfig = {
  /** Finger travel (pt) for the first step; later steps need less travel (see `curve`). */
  pixelsPerStep: number;
  /** Steps grow as (distance / pixelsPerStep) ^ curve: fine near the start, fast on long drags. */
  curve: number;
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
    curve: 1.6,
    stepMinor: baseStepMinor(currencyCode) * increment,
    maxAmountMinor: exponent === 0 ? 10_000_000 : 100_000 * Math.pow(10, exponent),
  };
}

/** Maps a vertical drag to an amount. Drag up = increase. Runs on the UI thread every frame. */
export function amountFromDrag(startMinor: number, translationY: number, config: DragConfig): number {
  'worklet';
  const distance = -translationY;
  const steps = Math.sign(distance) * Math.floor(Math.pow(Math.abs(distance) / config.pixelsPerStep, config.curve));
  if (steps === 0) return startMinor;

  const snapped = Math.round((startMinor + steps * config.stepMinor) / config.stepMinor) * config.stepMinor;
  return Math.min(Math.max(snapped, 0), config.maxAmountMinor);
}

export function clampAmount(amountMinor: number, config: DragConfig): number {
  return Math.min(Math.max(amountMinor, 0), config.maxAmountMinor);
}
