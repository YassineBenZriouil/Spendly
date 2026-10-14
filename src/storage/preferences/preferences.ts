import Storage from 'expo-sqlite/kv-store';
import { useSyncExternalStore } from 'react';

import { deviceCurrency } from '@/domain/money/money.format';
import { t } from '@/i18n';
import { isStorageFull } from '@/storage/database/errors';
import { AccentNames, type AccentName, type ThemeStyle } from '@/theme/tokens';

export type DragSensitivity = 'precise' | 'balanced' | 'fast';
/** Multiples of the currency's base drag step (1 major unit, or 10 for zero-decimal currencies like JPY). */
export type AmountIncrement = 1 | 5 | 10 | 50;

/** Stored separately from the expense ledger (key-value store, not the expenses database). */
export type AppPreferences = {
  currencyCode: string;
  /** Black & White (default for new installs) or Color. */
  themeStyle: ThemeStyle;
  /** Light or dark: follow the phone, or fixed. Applies to both styles. */
  theme: 'system' | 'light' | 'dark';
  /** Accent of the Color style. */
  accent: AccentName;
  hapticsEnabled: boolean;
  reducedMotion: 'system' | 'on' | 'off';
  dragSensitivity: DragSensitivity;
  amountIncrement: AmountIncrement;
  /** The first-launch introduction has been shown (it can be replayed from Settings). */
  onboardingSeen: boolean;
};

const KEY = 'preferences';

function defaults(): AppPreferences {
  return {
    currencyCode: deviceCurrency(),
    themeStyle: 'mono',
    theme: 'system',
    accent: 'lime',
    hapticsEnabled: true,
    reducedMotion: 'system',
    dragSensitivity: 'balanced',
    amountIncrement: 1,
    onboardingSeen: false,
  };
}

const allowed: { [K in keyof AppPreferences]-?: (value: unknown) => boolean } = {
  currencyCode: (v) => typeof v === 'string' && /^[A-Z]{3}$/.test(v),
  themeStyle: (v) => v === 'mono' || v === 'color',
  theme: (v) => v === 'system' || v === 'light' || v === 'dark',
  accent: (v) => AccentNames.includes(v as AccentName),
  hapticsEnabled: (v) => typeof v === 'boolean',
  reducedMotion: (v) => v === 'system' || v === 'on' || v === 'off',
  dragSensitivity: (v) => v === 'precise' || v === 'balanced' || v === 'fast',
  amountIncrement: (v) => v === 1 || v === 5 || v === 10 || v === 50,
  onboardingSeen: (v) => typeof v === 'boolean',
};

/** Only the known, valid preference values in `value` (from disk or a backup file); anything else is dropped. */
export function sanitizePreferences(value: unknown): Partial<AppPreferences> {
  if (!value || typeof value !== 'object') return {};
  return Object.fromEntries(
    Object.entries(value).filter(([key, entry]) => allowed[key as keyof AppPreferences]?.(entry)),
  ) as Partial<AppPreferences>;
}

/** Only what the user changed is stored; everything else falls back to defaults (e.g. device currency). */
function readStored(): Partial<AppPreferences> {
  try {
    const raw = Storage.getItemSync(KEY);
    return sanitizePreferences(raw ? JSON.parse(raw) : {});
  } catch {
    // Corrupt or unreadable: fall back to defaults rather than crash on launch
    return {};
  }
}

let current: AppPreferences | null = null;
const listeners = new Set<() => void>();

/**
 * Style for someone who has none stored yet. Existing users (anything stored) stay on Color, keeping their
 * System / Light / Dark choice; a fresh install starts on Black & White. Stored once on first read, so a new user
 * is never mistaken for an existing one on a later launch.
 */
export function initialThemeStyle(stored: Partial<AppPreferences>): ThemeStyle {
  return Object.keys(stored).length > 0 ? 'color' : 'mono';
}

/** Current preferences (read from disk once, then cached). Usable outside React, e.g. by the haptics service. */
export function getPreferences(): AppPreferences {
  if (current === null) {
    const stored = readStored();
    current = { ...defaults(), ...stored };
    if (stored.themeStyle === undefined) {
      current.themeStyle = initialThemeStyle(stored);
      try {
        Storage.setItemSync(KEY, JSON.stringify({ ...stored, themeStyle: current.themeStyle }));
      } catch {
        // Decided again on the next launch
      }
    }
  }
  return current;
}

/** Set when the last write to disk failed: the change applies now but would be lost on restart. */
let saveError: string | null = null;

/** Persists and applies immediately: every `usePreferences()` re-renders. */
export function updatePreferences(changes: Partial<AppPreferences>) {
  current = { ...getPreferences(), ...changes };
  try {
    Storage.setItemSync(KEY, JSON.stringify({ ...readStored(), ...changes }));
    saveError = null;
  } catch (error) {
    // Still applied for this session; the next change retries the write. Never silent: settings screens show it.
    saveError = isStorageFull(error)
      ? t('settings.saveError.storageFull')
      : t('settings.saveError.generic');
  }
  listeners.forEach((listener) => listener());
}

const getSaveError = () => saveError;

/** Why the last settings change couldn't be saved, or null. */
export function usePreferencesSaveError(): string | null {
  return useSyncExternalStore(subscribe, getSaveError);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function usePreferences(): AppPreferences {
  return useSyncExternalStore(subscribe, getPreferences);
}
