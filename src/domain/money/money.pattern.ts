import { currencyExponent, deviceLocale } from './money.format';

/**
 * Everything needed to format money without `Intl`, so it can run in a worklet on the UI thread
 * (live amount while dragging). Built once on the JS thread from `Intl`.
 */
export type MoneyPattern = {
  prefix: string;
  suffix: string;
  group: string;
  decimal: string;
  exponent: number;
  /** Size of the last integer group (3 in "1,234,567"; 3 in "12,34,567"). 0 = no grouping. */
  primaryGroup: number;
  /** Size of the other groups (3 in "1,234,567"; 2 in "12,34,567"). */
  secondaryGroup: number;
  /** Some locales (es, pl) leave 4-digit numbers ungrouped: "1234,50 €". */
  minimumGroupingDigits: number;
  /** Locale digits 0-9 (Latin or e.g. Arabic-Indic). */
  digits: string[];
};

/**
 * Only uses `Intl.NumberFormat#format`: Hermes on iOS has no `formatToParts`, so the structure
 * is read back from formatted sample numbers.
 */
export function getMoneyPattern(currencyCode: string, locale = deviceLocale()): MoneyPattern {
  const formatter = new Intl.NumberFormat(locale, { style: 'currency', currency: currencyCode });
  const exponent = currencyExponent(currencyCode);

  const digitFormatter = new Intl.NumberFormat(locale, { useGrouping: false });
  const digits = Array.from({ length: 10 }, (_, i) => digitFormatter.format(i));
  const toLatin = (text: string) =>
    [...text].map((char) => (digits.includes(char) ? String(digits.indexOf(char)) : char)).join('');
  const isDigit = (char: string) => char >= '0' && char <= '9';

  /** "$1,234,567.89" -> prefix "$", integer "1,234,567", decimal ".", suffix "" */
  const split = (value: number) => {
    const chars = [...toLatin(formatter.format(value))];
    const first = chars.findIndex(isDigit);
    const last = chars.length - 1 - [...chars].reverse().findIndex(isDigit);
    const number = chars.slice(first, last + 1).join('');
    let integer = number;
    let decimal = '.';
    if (exponent > 0) {
      const beforeFraction = number.slice(0, -exponent);
      const separatorStart = beforeFraction.search(/[^0-9]+$/);
      decimal = beforeFraction.slice(separatorStart);
      integer = beforeFraction.slice(0, separatorStart);
    }
    return { prefix: chars.slice(0, first).join(''), suffix: chars.slice(last + 1).join(''), integer, decimal };
  };

  const { prefix, suffix, integer, decimal } = split(1234567.891);
  const integerGroups = integer.split(/[^0-9]+/);
  const group = integer.match(/[^0-9]+/)?.[0] ?? '';
  const primaryGroup = integerGroups.length > 1 ? integerGroups[integerGroups.length - 1].length : 0;
  const secondaryGroup =
    integerGroups.length > 2 ? integerGroups[integerGroups.length - 2].length : primaryGroup;
  // "1,234" vs Spanish "1234"
  const groupsFourDigits = /[^0-9]/.test(split(1234).integer);

  return {
    prefix,
    suffix,
    group,
    decimal,
    exponent,
    primaryGroup,
    secondaryGroup,
    minimumGroupingDigits: groupsFourDigits ? 1 : 2,
    digits,
  };
}

/** Formats integer minor units with a pattern. Runs on the UI thread. */
export function formatWithPattern(amountMinor: number, pattern: MoneyPattern): string {
  'worklet';
  const unit = Math.pow(10, pattern.exponent);
  const major = Math.floor(amountMinor / unit);
  const minor = amountMinor - major * unit;

  let integer = String(major);
  const { primaryGroup, secondaryGroup } = pattern;
  if (primaryGroup > 0 && integer.length >= primaryGroup + pattern.minimumGroupingDigits) {
    let grouped = integer.slice(-primaryGroup);
    let rest = integer.slice(0, -primaryGroup);
    while (rest.length > secondaryGroup) {
      grouped = rest.slice(-secondaryGroup) + pattern.group + grouped;
      rest = rest.slice(0, -secondaryGroup);
    }
    integer = rest + pattern.group + grouped;
  }

  let text = integer;
  if (pattern.exponent > 0) {
    text += pattern.decimal + String(minor).padStart(pattern.exponent, '0');
  }

  if (pattern.digits[0] !== '0') {
    let localized = '';
    for (const char of text) {
      const digit = char.charCodeAt(0) - 48;
      localized += digit >= 0 && digit <= 9 ? pattern.digits[digit] : char;
    }
    text = localized;
  }

  return pattern.prefix + text + pattern.suffix;
}
