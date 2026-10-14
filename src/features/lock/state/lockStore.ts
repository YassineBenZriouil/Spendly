import { useSyncExternalStore } from 'react';

import { getPreferences } from '@/storage/preferences/preferences';

/**
 * unlocked: the app is usable · covered: the privacy cover hides it (app switcher, notification centre) ·
 * locked: Face ID, fingerprint or passcode needed.
 */
export type LockStatus = 'unlocked' | 'covered' | 'locked';

/** Lock again on return when the app was in the background at least the grace period, unless a system sheet we opened sent it there. */
export function shouldLock({
  enabled,
  graceSeconds,
  backgroundedAt,
  now,
  exempt,
}: {
  enabled: boolean;
  graceSeconds: number;
  backgroundedAt: number | null;
  now: number;
  exempt: boolean;
}): boolean {
  return enabled && !exempt && backgroundedAt !== null && now - backgroundedAt >= graceSeconds * 1000;
}

/** What the system says about the app (AppState). */
export type AppActivity = 'active' | 'inactive' | 'background';

let status: LockStatus = getPreferences().appLock ? 'locked' : 'unlocked';
let backgroundedAt: number | null = null;
/** System screens the app itself opened (camera, photo library, share sheet, file picker): no lock on return. */
let exemptCount = 0;
const listeners = new Set<() => void>();

const set = (next: LockStatus) => {
  if (next === status) return;
  status = next;
  listeners.forEach((listener) => listener());
};

export const lockStore = {
  get: () => status,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  appActivity(activity: AppActivity, now = Date.now()) {
    const { appLock, lockGraceSeconds } = getPreferences();
    if (!appLock) return set('unlocked');
    if (activity === 'background') backgroundedAt ??= now;
    if (activity === 'active') {
      const lock = shouldLock({ enabled: appLock, graceSeconds: lockGraceSeconds, backgroundedAt, now, exempt: exemptCount > 0 });
      backgroundedAt = null;
      if (lock) set('locked');
      else if (status === 'covered') set('unlocked');
    } else if (status === 'unlocked' && exemptCount === 0) {
      // Covered before the system takes its app switcher snapshot (not behind a picker or prompt opened from the app)
      set('covered');
    }
  },

  unlock() {
    backgroundedAt = null;
    set('unlocked');
  },

  /** Runs `task` (which opens a system screen) without the app locking when it comes back from it. */
  async withoutLock<T>(task: () => Promise<T>): Promise<T> {
    exemptCount++;
    try {
      return await task();
    } finally {
      exemptCount--;
    }
  },
};

export const useLockStatus = () => useSyncExternalStore(lockStore.subscribe, lockStore.get);
