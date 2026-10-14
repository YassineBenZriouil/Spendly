import type { MoneyPattern } from '@/domain/money/money.pattern';

/** Widths (pt) used to lay out a number without measuring text. */
export type NumberMetrics = {
  digit: number;
  separator: number;
};

/** "1,234.50" from "$1,234.50": the part made of digits and separators. */
export function numberPart(formatted: string, pattern: MoneyPattern): string {
  'worklet';
  return formatted.slice(pattern.prefix.length, formatted.length - pattern.suffix.length);
}

/** 0-9 for a (possibly localized) digit, -1 for anything else. */
export function digitValue(char: string, pattern: MoneyPattern): number {
  'worklet';
  return char === '' ? -1 : pattern.digits.indexOf(char);
}

/** The character `k` places from the right ('' past the start). */
export function charFromRight(part: string, k: number): string {
  'worklet';
  const index = part.length - 1 - k;
  return index >= 0 ? part.charAt(index) : '';
}

function charWidth(char: string, pattern: MoneyPattern, metrics: NumberMetrics): number {
  'worklet';
  if (char === '') return 0;
  return digitValue(char, pattern) >= 0 ? metrics.digit : metrics.separator;
}

/** Width of the `k` rightmost characters: where the slot `k` places from the right ends. */
export function widthOfRightmost(part: string, k: number, pattern: MoneyPattern, metrics: NumberMetrics): number {
  'worklet';
  let width = 0;
  for (let j = 0; j < k; j++) width += charWidth(charFromRight(part, j), pattern, metrics);
  return width;
}

export function slotWidth(part: string, k: number, pattern: MoneyPattern, metrics: NumberMetrics): number {
  'worklet';
  return charWidth(charFromRight(part, k), pattern, metrics);
}

/**
 * Where a digit's column should move when it changes from `previous` to `next`. The column holds
 * 9, 0, 1, ... 9, 0 (positions -1 to 10), so a single-step carry rolls the way the value moved:
 * 9 → 0 while increasing rolls up to the bottom 0 (10); 0 → 9 while decreasing rolls down to the top 9 (-1).
 * Larger jumps take the direct path.
 */
export function rollTarget(previous: number, next: number, increasing: boolean): number {
  'worklet';
  if (increasing && previous === 9 && next === 0) return 10;
  if (!increasing && previous === 0 && next === 9) return -1;
  return next;
}

/** The same glyph position folded back into the middle of the column, so the next roll has room. */
export function foldPosition(position: number): number {
  'worklet';
  if (position > 9.5) return position - 10;
  if (position < -0.5) return position + 10;
  return position;
}
