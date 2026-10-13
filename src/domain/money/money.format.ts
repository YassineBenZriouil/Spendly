import { getLocales } from 'expo-localization';

/** Number of minor-unit digits for a currency (JPY 0, EUR 2, KWD 3), from the platform's Intl data. */
export function currencyExponent(currencyCode: string): number {
  return (
    new Intl.NumberFormat('en', { style: 'currency', currency: currencyCode }).resolvedOptions()
      .maximumFractionDigits ?? 2
  );
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
