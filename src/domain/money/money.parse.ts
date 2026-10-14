/** Keypad input is a plain string like "12.5" (always "." internally; display is localized). */
export type KeypadKey = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'decimal' | 'backspace';

const MAX_INTEGER_DIGITS = 8;

export function applyKeypadKey(input: string, key: KeypadKey, exponent: number): string {
  if (key === 'backspace') return input.slice(0, -1);

  const [integer, fraction] = input.split('.');

  if (key === 'decimal') {
    if (exponent === 0 || fraction !== undefined) return input;
    return (input === '' ? '0' : input) + '.';
  }

  if (fraction !== undefined) return fraction.length >= exponent ? input : input + key;
  if (integer === '0') return key; // no leading zeros
  if (integer.length >= MAX_INTEGER_DIGITS) return input;
  return input + key;
}

export function inputToMinor(input: string, exponent: number): number {
  if (input === '') return 0;
  const [integer, fraction = ''] = input.split('.');
  const minorDigits = fraction.padEnd(exponent, '0').slice(0, exponent);
  return Number(integer || '0') * Math.pow(10, exponent) + Number(minorDigits || '0');
}

export function minorToInput(amountMinor: number, exponent: number): string {
  if (amountMinor === 0) return '';
  const unit = Math.pow(10, exponent);
  const integer = Math.floor(amountMinor / unit);
  const fraction = amountMinor % unit;
  if (fraction === 0) return String(integer);
  return `${integer}.${String(fraction).padStart(exponent, '0').replace(/0+$/, '')}`;
}

/**
 * A typed amount ("12,50", "12.50", "1 234,5", "1,234.50") in minor units, or null if it isn't a positive amount.
 * The last "," or "." is the decimal separator when it has at most `exponent` digits after it; any other is grouping.
 */
export function parseTypedAmount(text: string, exponent: number): number | null {
  const compact = text.replace(/[\s\u00A0\u202F']/g, '');
  if (!/^[\d.,]+$/.test(compact) || !/\d/.test(compact)) return null;
  const last = Math.max(compact.lastIndexOf('.'), compact.lastIndexOf(','));
  const decimals = last >= 0 ? compact.length - last - 1 : 0;
  const hasDecimal = last >= 0 && exponent > 0 && decimals > 0 && decimals <= exponent;
  const integer = (hasDecimal ? compact.slice(0, last) : compact).replace(/[.,]/g, '');
  const fraction = hasDecimal ? compact.slice(last + 1) : '';
  if (integer.length > MAX_INTEGER_DIGITS) return null;
  const minor = inputToMinor(`${integer || '0'}${fraction ? `.${fraction}` : ''}`, exponent);
  return minor > 0 ? minor : null;
}

