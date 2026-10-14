import { resolveLanguage } from '..';

describe('resolveLanguage', () => {
  it('uses the language chosen in Settings, whatever the phone says', () => {
    expect(resolveLanguage('ar', ['en', 'fr'])).toBe('ar');
    expect(resolveLanguage('en', ['ar'])).toBe('en');
  });

  it('follows the first phone language Spendly speaks when set to System', () => {
    expect(resolveLanguage('system', ['fr', 'ar', 'en'])).toBe('ar');
    expect(resolveLanguage('system', ['en', 'ar'])).toBe('en');
  });

  it('falls back to English when the phone speaks nothing Spendly does', () => {
    expect(resolveLanguage('system', ['fr', null])).toBe('en');
    expect(resolveLanguage('system', [])).toBe('en');
  });
});
