import { currencyExponent } from '@/domain/money/money.format';

export type DragConfig = {
  /** Finger travel (pt) for the first step; later steps need less travel (see `curve`). */
  pixelsPerStep: number;
  /** Steps grow as (distance / pixelsPerStep) ^ curve: fine near the start, fast on long drags. */
  curve: number;
  stepMinor: number;
  maxAmountMinor: number;
};

export function dragConfigFor(currencyCode: string): DragConfig {
  const exponent = currencyExponent(currencyCode);
  const unit = Math.pow(10, exponent);
  return {
    pixelsPerStep: 9,
    curve: 1.6,
    // One major unit per step; zero-decimal currencies (JPY, KRW) have small units, so 10 per step
    stepMinor: exponent === 0 ? 10 : unit,
    maxAmountMinor: exponent === 0 ? 10_000_000 : 100_000 * unit,
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
