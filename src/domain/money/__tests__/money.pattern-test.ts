import { formatMoney } from '../money.format';
import { formatWithPattern, getMoneyPattern } from '../money.pattern';

jest.mock('expo-localization', () => ({ getLocales: () => [] }));

const cases: [locale: string, currency: string][] = [
  ['en-US', 'USD'],
  ['fr-FR', 'EUR'],
  ['de-DE', 'EUR'],
  ['es-ES', 'EUR'],
  ['en-IN', 'INR'],
  ['ja-JP', 'JPY'],
  ['fr-MA', 'MAD'],
  ['ar-EG', 'EGP'],
  ['en-US', 'KWD'],
];

const amounts = [0, 5, 99, 1050, 123456, 12345678, 1234567890];

describe('getMoneyPattern', () => {
  it('does not need Intl formatToParts (missing in Hermes on iOS)', () => {
    const original = Intl.NumberFormat.prototype.formatToParts;
    // @ts-expect-error simulating Hermes
    delete Intl.NumberFormat.prototype.formatToParts;
    try {
      expect(formatWithPattern(123456, getMoneyPattern('USD', 'en-US'))).toBe('$1,234.56');
    } finally {
      Intl.NumberFormat.prototype.formatToParts = original;
    }
  });
});

describe('formatWithPattern', () => {
  it.each(cases)('matches Intl for %s %s', (locale, currency) => {
    const pattern = getMoneyPattern(currency, locale);
    for (const amount of amounts) {
      expect(formatWithPattern(amount, pattern)).toBe(formatMoney(amount, currency, locale));
    }
  });
});
