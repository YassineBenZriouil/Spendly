import { getLocales } from 'expo-localization';
import Storage from 'expo-sqlite/kv-store';
import { I18nManager } from 'react-native';

import { ar } from './locales/ar';
import { en, type MessageKey } from './locales/en';
import { pluralCategory, type Language } from './plural';
import type { Message } from './types';

export type { MessageKey } from './locales/en';
export type { Language } from './plural';

const catalogs: Record<Language, Partial<Record<MessageKey, Message>>> = { en, ar };

/** The user's choice in Settings: follow the phone, or a fixed language. */
export type LanguagePreference = 'system' | Language;

const PREFERENCE_KEY = 'language';
const SUPPORTED: Language[] = ['en', 'ar'];

/** The language to use: the chosen one, or the first of the device's languages Spendly speaks (English otherwise). */
export function resolveLanguage(preference: LanguagePreference, deviceLanguages: (string | null)[]): Language {
  if (preference !== 'system') return preference;
  return (deviceLanguages.find((code) => SUPPORTED.includes(code as Language)) as Language | undefined) ?? 'en';
}

function readPreference(): LanguagePreference {
  try {
    const stored = Storage.getItemSync(PREFERENCE_KEY);
    return stored === 'en' || stored === 'ar' ? stored : 'system';
  } catch {
    return 'system';
  }
}

function deviceLanguages(): (string | null)[] {
  try {
    return getLocales().map((locale) => locale.languageCode);
  } catch {
    return [];
  }
}

/** Read once at launch: every screen (and module-level text) uses it; changing it restarts the app. */
export const languagePreference: LanguagePreference = readPreference();
export const language: Language = resolveLanguage(languagePreference, deviceLanguages());

/**
 * Stores the choice and sets the layout direction it needs; both take effect on the next start, so the caller
 * restarts the app (`reloadAppAsync`). Right-to-left is forced for Arabic, refused for English, and left to the
 * phone for "system".
 */
export function setLanguagePreference(preference: LanguagePreference) {
  if (preference === 'system') Storage.removeItemSync(PREFERENCE_KEY);
  else Storage.setItemSync(PREFERENCE_KEY, preference);
  I18nManager.allowRTL(preference !== 'en');
  I18nManager.forceRTL(preference === 'ar');
}

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
