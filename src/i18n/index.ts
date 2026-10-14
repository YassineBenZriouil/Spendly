import { getLocales } from 'expo-localization';

import { ar } from './locales/ar';
import { en, type MessageKey } from './locales/en';
import { pluralCategory, type Language } from './plural';
import type { Message } from './types';

export type { MessageKey } from './locales/en';
export type { Language } from './plural';

const catalogs: Record<Language, Partial<Record<MessageKey, Message>>> = { en, ar };

/** The first of the device's preferred languages that Spendly speaks; English otherwise. Read once at launch. */
function detectLanguage(): Language {
  try {
    for (const locale of getLocales()) {
      if (locale.languageCode === 'ar') return 'ar';
      if (locale.languageCode === 'en') return 'en';
    }
  } catch {
    // Fall through to English
  }
  return 'en';
}

export const language: Language = detectLanguage();

type Params = Record<string, string | number>;

/** Fills `{name}` placeholders; unknown placeholders are left as is so a missing value is visible, not silent. */
function fill(text: string, params: Params | undefined) {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match));
}

/**
 * The text for `key` in the app's language (falling back to English), with `{name}` placeholders filled from
 * `params`. Plural messages pick their form from `params.count`.
 */
export function t(key: MessageKey, params?: Params, lang: Language = language): string {
  const message = (catalogs[lang][key] ?? en[key]) as Message;
  if (typeof message === 'string') return fill(message, params);
  const count = Number(params?.count ?? 0);
  const form = message[pluralCategory(lang, count)] ?? message.other;
  return fill(form, params);
}
