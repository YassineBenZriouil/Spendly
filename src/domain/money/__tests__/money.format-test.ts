import { currencyExponent, formatMoney } from '../money.format';

jest.mock('expo-localization', () => ({ getLocales: () => [] }));

describe('currencyExponent', () => {
  it('knows zero, two and three digit currencies', () => {
    expect(currencyExponent('JPY')).toBe(0);
    expect(currencyExponent('EUR')).toBe(2);
    expect(currencyExponent('KWD')).toBe(3);
  });
});

describe('formatMoney', () => {
  it('formats minor units using the currency exponent', () => {
    expect(formatMoney(1250, 'USD', 'en-US')).toBe('$12.50');
    expect(formatMoney(1250, 'JPY', 'en-US')).toBe('¥1,250');
    // Intl separates code and amount with a no-break space
    expect(formatMoney(1250, 'KWD', 'en-US')).toBe('KWD\u00a01.250');
  });

  it('falls back to en-US when the device has no locale', () => {
    expect(formatMoney(0, 'USD')).toBe('$0.00');
  });
});
