import Storage from 'expo-sqlite/kv-store';
import { useSyncExternalStore } from 'react';

import { deviceCurrency } from '@/domain/money/money.format';

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

/** Only what the user changed is stored; everything else falls back to defaults (e.g. device currency). */
function readStored(): Partial<AppPreferences> {
  try {
    const raw = Storage.getItemSync(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== 'object') return {};
    // Drop unknown or invalid values instead of trusting whatever is on disk
    return Object.fromEntries(
      Object.entries(parsed).filter(([key, value]) => allowed[key as keyof AppPreferences]?.(value)),
    ) as Partial<AppPreferences>;
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

/** Persists and applies immediately: every `usePreferences()` re-renders. */
export function updatePreferences(changes: Partial<AppPreferences>) {
  current = { ...getPreferences(), ...changes };
  try {
    Storage.setItemSync(KEY, JSON.stringify({ ...readStored(), ...changes }));
  } catch {
    // Still applied for this session; the next change retries the write
  }
  listeners.forEach((listener) => listener());
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
