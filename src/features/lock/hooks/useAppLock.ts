import { useEffect } from 'react';
import { AppState } from 'react-native';

import { lockStore, useLockStatus } from '../state/lockStore';

/**
 * Feeds the app's activity to the lock (root layout) and returns the lock status. Android's blur / focus events are
 * not used: they also fire for every dialog (alerts, pickers, the fingerprint prompt), which would cover the app
 * behind each of them.
 */
export function useAppLock() {
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (status) =>
      lockStore.appActivity(status === 'active' || status === 'background' ? status : 'inactive'),
    );
    return () => subscription.remove();
  }, []);
  return useLockStatus();
}
