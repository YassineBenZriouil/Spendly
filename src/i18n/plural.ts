import type { PluralForms } from './types';

export type Language = 'en' | 'ar';
export type PluralCategory = keyof PluralForms;

/**
 * CLDR plural rules for the shipped languages, for whole numbers. Written out instead of `Intl.PluralRules`, which
 * Hermes does not reliably provide on iOS (see CLAUDE.md on Hermes' partial Intl).
 */
export function pluralCategory(language: Language, count: number): PluralCategory {
  const n = Math.abs(Math.trunc(count));
  if (language === 'ar') {
    if (n === 0) return 'zero';
    if (n === 1) return 'one';
    if (n === 2) return 'two';
    const lastTwo = n % 100;
    if (lastTwo >= 3 && lastTwo <= 10) return 'few';
    if (lastTwo >= 11 && lastTwo <= 99) return 'many';
    return 'other';
  }
  return n === 1 ? 'one' : 'other';
}
