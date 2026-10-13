import Storage from 'expo-sqlite/kv-store';

import { deviceCurrency } from '@/domain/money/money.format';

/** Stored separately from the expense ledger (key-value store, not the expenses database). */
export type AppPreferences = {
  currencyCode: string;
  theme: 'system' | 'light' | 'dark';
  hapticsEnabled: boolean;
  reducedMotion: 'system' | 'on' | 'off';
  defaultCategoryMode: 'none' | 'lastUsed';
  lastUsedCategoryId?: string;
  dragSensitivity: 'precise' | 'balanced' | 'fast';
};

const KEY = 'preferences';

function defaults(): AppPreferences {
  return {
    currencyCode: deviceCurrency(),
    theme: 'system',
    hapticsEnabled: true,
    reducedMotion: 'system',
    defaultCategoryMode: 'none',
    dragSensitivity: 'balanced',
  };
}

/** Only what the user changed is stored; everything else falls back to defaults (e.g. device currency). */
function readStored(): Partial<AppPreferences> {
  try {
    const raw = Storage.getItemSync(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? (parsed as Partial<AppPreferences>) : {};
  } catch {
    // Corrupt or unreadable: fall back to defaults rather than crash on launch
    return {};
  }
}

export function loadPreferences(): AppPreferences {
  return { ...defaults(), ...readStored() };
}

export function savePreferences(changes: Partial<AppPreferences>) {
  Storage.setItemSync(KEY, JSON.stringify({ ...readStored(), ...changes }));
}
