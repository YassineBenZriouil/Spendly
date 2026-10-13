import { useReducedMotion as useSystemReducedMotion } from 'react-native-reanimated';

/** Single entry point for "should we shrink motion?". Phase 4 adds the System / On / Off preference here. */
export function useReducedMotion() {
  return useSystemReducedMotion();
}
