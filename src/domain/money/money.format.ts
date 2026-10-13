import { getLocales } from 'expo-localization';

/** Number of minor-unit digits for a currency (JPY 0, EUR 2, KWD 3), read from how `Intl` formats 1 ("$1.00"). */
export function currencyExponent(currencyCode: string): number {
  // Only `format`: Hermes on iOS lacks some Intl APIs (formatToParts) and options
  const one = new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode }).format(1);
  return one.match(/1\.(\d+)/)?.[1].length ?? 0;
}

/** Formats integer minor units, e.g. (1250, 'EUR', 'fr-FR') -> "12,50 €". */
export function formatMoney(amountMinor: number, currencyCode: string, locale = deviceLocale()) {
  const exponent = currencyExponent(currencyCode);
  return new Intl.NumberFormat(locale, { style: 'currency', currency: currencyCode }).format(
    amountMinor / 10 ** exponent,
  );
}

export function deviceLocale() {
  return getLocales()[0]?.languageTag ?? 'en-US';
}

export function deviceCurrency() {
  return getLocales()[0]?.currencyCode ?? 'USD';
}
