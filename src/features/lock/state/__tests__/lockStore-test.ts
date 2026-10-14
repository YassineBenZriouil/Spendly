import { updatePreferences } from '@/storage/preferences/preferences';

import { lockStore, shouldLock } from '../lockStore';

jest.mock('expo-sqlite/kv-store', () => ({
  __esModule: true,
  default: { getItemSync: () => null, setItemSync: () => undefined, removeItemSync: () => undefined },
}));

describe('shouldLock', () => {
  const base = { enabled: true, graceSeconds: 0, backgroundedAt: 1000, now: 1000, exempt: false };

  it('locks on every return when the grace period is 0', () => {
    expect(shouldLock(base)).toBe(true);
  });

  it('waits for the grace period', () => {
    expect(shouldLock({ ...base, graceSeconds: 60, now: 1000 + 59_999 })).toBe(false);
    expect(shouldLock({ ...base, graceSeconds: 60, now: 1000 + 60_000 })).toBe(true);
  });

  it('never locks when off, without a trip to the background, or after a system sheet the app opened', () => {
    expect(shouldLock({ ...base, enabled: false })).toBe(false);
    expect(shouldLock({ ...base, backgroundedAt: null })).toBe(false);
    expect(shouldLock({ ...base, exempt: true })).toBe(false);
  });
});

describe('lockStore', () => {
  beforeEach(() => {
    updatePreferences({ appLock: true, lockGraceSeconds: 0 });
    lockStore.unlock();
  });

  it('covers when leaving, locks on return', () => {
    lockStore.appActivity('inactive', 0);
    expect(lockStore.get()).toBe('covered');
    lockStore.appActivity('background', 0);
    lockStore.appActivity('active', 10);
    expect(lockStore.get()).toBe('locked');
  });

  it('a glance at the notification centre (inactive only) uncovers without locking', () => {
    lockStore.appActivity('inactive', 0);
    lockStore.appActivity('active', 10);
    expect(lockStore.get()).toBe('unlocked');
  });

  it('the Face ID prompt (inactive while locked) keeps it locked until unlocked', () => {
    lockStore.appActivity('background', 0);
    lockStore.appActivity('active', 10);
    lockStore.appActivity('inactive', 20);
    lockStore.appActivity('active', 30);
    expect(lockStore.get()).toBe('locked');
    lockStore.unlock();
    expect(lockStore.get()).toBe('unlocked');
  });

  it('the camera or share sheet the app opened does not lock it', async () => {
    await lockStore.withoutLock(async () => {
      lockStore.appActivity('inactive', 0);
      // No cover flashing behind the picker
      expect(lockStore.get()).toBe('unlocked');
      lockStore.appActivity('background', 0);
      lockStore.appActivity('active', 10_000);
    });
    expect(lockStore.get()).toBe('unlocked');
  });

  it('turning the lock off unlocks at once', () => {
    lockStore.appActivity('background', 0);
    lockStore.appActivity('active', 10);
    updatePreferences({ appLock: false });
    lockStore.appActivity('active', 20);
    expect(lockStore.get()).toBe('unlocked');
  });
});
