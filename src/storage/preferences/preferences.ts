import Storage from 'expo-sqlite/kv-store';
import { useSyncExternalStore } from 'react';

import { deviceCurrency } from '@/domain/money/money.format';
import { t } from '@/i18n';
import { isStorageFull } from '@/storage/database/errors';

export type DragSensitivity = 'precise' | 'balanced' | 'fast';
/** Multiples of the currency's base drag step (1 major unit, or 10 for zero-decimal currencies like JPY). */
export type AmountIncrement = 1 | 5 | 10 | 50;

/** Stored separately from the expense ledger (key-value store, not the expenses database). */
export type AppPreferences = {
  currencyCode: string;
  theme: 'system' | 'light' | 'dark';
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
    theme: 'system',
    hapticsEnabled: true,
    reducedMotion: 'system',
    dragSensitivity: 'balanced',
    amountIncrement: 1,
    onboardingSeen: false,
  };
}

const allowed: { [K in keyof AppPreferences]-?: (value: unknown) => boolean } = {
  currencyCode: (v) => typeof v === 'string' && /^[A-Z]{3}$/.test(v),
  theme: (v) => v === 'system' || v === 'light' || v === 'dark',
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

/** Current preferences (read from disk once, then cached). Usable outside React, e.g. by the haptics service. */
export function getPreferences(): AppPreferences {
  current ??= { ...defaults(), ...readStored() };
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
