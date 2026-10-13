import { useReducedMotion as useSystemReducedMotion } from 'react-native-reanimated';

import { usePreferences } from '@/storage/preferences/preferences';

/** Single entry point for "should we shrink motion?": the Settings choice, or the system setting when it's "System". */
export function useReducedMotion() {
  const system = useSystemReducedMotion();
  const { reducedMotion } = usePreferences();
  return reducedMotion === 'system' ? system : reducedMotion === 'on';
}
