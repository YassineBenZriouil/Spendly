import { getPreferences, restorablePreferences } from '../preferences';

jest.mock('expo-sqlite/kv-store', () => ({
  __esModule: true,
  default: { getItemSync: () => null, setItemSync: () => undefined, removeItemSync: () => undefined },
}));

describe('lock and reminder preferences', () => {
  it('are off on a new install', () => {
    const { appLock, lockGraceSeconds, reminder } = getPreferences();
    expect({ appLock, lockGraceSeconds, reminder }).toEqual({ appLock: false, lockGraceSeconds: 0, reminder: undefined });
  });

  it('are never applied from a backup (nothing turns on by surprise), while the rest is', () => {
    const fromBackup = { appLock: true, lockGraceSeconds: 60, reminder: { hour: 20, minute: 0 }, hapticsEnabled: false };
    expect(restorablePreferences(fromBackup)).toEqual({ hapticsEnabled: false });
  });
});
