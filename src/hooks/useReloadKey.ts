import { useIsFocused } from 'expo-router';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

type ChangeSource = { subscribe(listener: () => void): () => void };

/**
 * A number to put in a loading effect's dependencies: it changes after a write to any of `sources` and when the app
 * returns (the day may have changed). While the screen is hidden (another tab, or a screen pushed on top) these only
 * mark it stale, and it changes once when the screen is shown again, so hidden screens never reload. Changes in the
 * same tick are batched into one reload. Pass a module-level array, so the subscription isn't redone every render.
 */
export function useReloadKey(sources: readonly ChangeSource[]): number {
  const focused = useIsFocused();
  const [key, setKey] = useState(0);
  const [stale, setStale] = useState(false);

  if (focused && stale) {
    setStale(false);
    setKey(key + 1);
  }

  useEffect(() => {
    const changed = () => (focused ? setKey((current) => current + 1) : setStale(true));
    const unsubscribes = sources.map((source) => source.subscribe(changed));
    const appState = AppState.addEventListener('change', (status) => status === 'active' && changed());
    return () => {
      unsubscribes.forEach((unsubscribe) => unsubscribe());
      appState.remove();
    };
  }, [focused, sources]);

  return key;
}
