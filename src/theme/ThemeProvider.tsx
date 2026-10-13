import { createContext, use, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { updatePreferences, usePreferences } from '@/storage/preferences/preferences';

import { CategoryColors, Colors, type ColorScheme } from './tokens';

export type ThemePreference = 'system' | 'light' | 'dark';

type ThemeContextValue = {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
  scheme: ColorScheme;
  colors: (typeof Colors)[ColorScheme];
  categoryColors: (typeof CategoryColors)[ColorScheme];
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const preference = usePreferences().theme;
  const setPreference = (theme: ThemePreference) => updatePreferences({ theme });
  const system = useColorScheme();
  const scheme: ColorScheme =
    preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference;

  return (
    <ThemeContext
      value={{
        preference,
        setPreference,
        scheme,
        colors: Colors[scheme],
        categoryColors: CategoryColors[scheme],
      }}>
      {children}
    </ThemeContext>
  );
}

export function useTheme() {
  const theme = use(ThemeContext);
  if (!theme) throw new Error('useTheme must be used inside ThemeProvider');
  return theme;
}
