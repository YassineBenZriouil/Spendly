import Storage from 'expo-sqlite/kv-store';
import { useSyncExternalStore } from 'react';

import { parseBudget, type Budget } from '@/domain/budget/budget';
import { isQuickLog, type QuickLog } from '@/domain/links/addLink';
import { deviceCurrency } from '@/domain/money/money.format';
import { isReminderTime, type ReminderTime } from '@/domain/reminder/reminder';
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
  /** Monthly budget (overall and / or per category), shown only in Insights. Absent: no budget. */
  budget?: Budget;
  hapticsEnabled: boolean;
  reducedMotion: 'system' | 'on' | 'off';
  dragSensitivity: DragSensitivity;
  amountIncrement: AmountIncrement;
  /** The first-launch introduction has been shown (it can be replayed from Settings). */
  onboardingSeen: boolean;
  /** App lock (Face ID, fingerprint or passcode). Off by default; this phone only, never restored from a backup. */
  appLock: boolean;
  /** How long the app may stay in the background before it locks again: 0 (immediately) or 60 seconds. */
  lockGraceSeconds: LockGraceSeconds;
  /** Daily reminder time; absent: off (the default). This phone only, never restored from a backup. */
  reminder?: ReminderTime;
  /** The expense `spendly://add?quick=1` saves (Siri / Shortcuts, the Android tile). Absent: not set up. */
  quickLog?: QuickLog;
  /** Weekly backup file kept on the phone. Off by default; this phone only. */
  autoBackup: boolean;
  /** When the last auto-backup was written, and the last failure (shown in Settings). This phone only. */
  autoBackupStatus?: AutoBackupStatus;
  /** The month ("2026-10") whose recap card was dismissed in Insights. */
  recapDismissed?: string;
};

export type AutoBackupStatus = { lastAt?: string; failedAt?: string; error?: string };

const isAutoBackupStatus = (v: unknown): v is AutoBackupStatus => {
  if (!v || typeof v !== 'object') return false;
  const { lastAt, failedAt, error } = v as Record<string, unknown>;
  const optionalString = (value: unknown) => value === undefined || typeof value === 'string';
  return optionalString(lastAt) && optionalString(failedAt) && optionalString(error);
};

export type LockGraceSeconds = 0 | 60;

/** Settings that belong to this phone: a restored backup never changes them (nothing turns on by surprise). */
export const DEVICE_ONLY_PREFERENCES = ['appLock', 'lockGraceSeconds', 'reminder', 'autoBackup', 'autoBackupStatus'] as const;

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
    appLock: false,
    lockGraceSeconds: 0,
    autoBackup: false,
  };
}

const allowed: { [K in keyof AppPreferences]-?: (value: unknown) => boolean } = {
  currencyCode: (v) => typeof v === 'string' && /^[A-Z]{3}$/.test(v),
  themeStyle: (v) => v === 'mono' || v === 'color',
  theme: (v) => v === 'system' || v === 'light' || v === 'dark',
  accent: (v) => AccentNames.includes(v as AccentName),
  budget: (v) => parseBudget(v) !== null,
  hapticsEnabled: (v) => typeof v === 'boolean',
  reducedMotion: (v) => v === 'system' || v === 'on' || v === 'off',
  dragSensitivity: (v) => v === 'precise' || v === 'balanced' || v === 'fast',
  amountIncrement: (v) => v === 1 || v === 5 || v === 10 || v === 50,
  onboardingSeen: (v) => typeof v === 'boolean',
  appLock: (v) => typeof v === 'boolean',
  lockGraceSeconds: (v) => v === 0 || v === 60,
  reminder: isReminderTime,
  quickLog: isQuickLog,
  autoBackup: (v) => typeof v === 'boolean',
  autoBackupStatus: isAutoBackupStatus,
  recapDismissed: (v) => typeof v === 'string' && /^\d{4}-\d{2}$/.test(v),
};

/** Only the known, valid preference values in `value` (from disk or a backup file); anything else is dropped. */
export function sanitizePreferences(value: unknown): Partial<AppPreferences> {
  if (!value || typeof value !== 'object') return {};
  return Object.fromEntries(
    Object.entries(value).filter(([key, entry]) => allowed[key as keyof AppPreferences]?.(entry)),
  ) as Partial<AppPreferences>;
}

/** Preferences from a backup file that may be applied here: valid ones, minus this phone's own (lock, reminder, auto-backup). */
export function restorablePreferences(value: unknown): Partial<AppPreferences> {
  const preferences = sanitizePreferences(value);
  for (const key of DEVICE_ONLY_PREFERENCES) delete preferences[key];
  return preferences;
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
/** Applies `changes` at once; returns false when they could not be stored (the reason is in `usePreferencesSaveError`). */
export function updatePreferences(changes: Partial<AppPreferences>): boolean {
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
  return saveError === null;
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
