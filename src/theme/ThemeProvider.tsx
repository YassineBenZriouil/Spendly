import { createContext, use, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { updatePreferences, usePreferences } from '@/storage/preferences/preferences';

import {
  themeCategoryColors,
  themeColors,
  type AccentName,
  type CategoryColorToken,
  type ColorScheme,
  type ThemeColors,
  type ThemeStyle,
} from './tokens';

export type ThemePreference = 'system' | 'light' | 'dark';

type ThemeContextValue = {
  /** Black & White or Color. */
  style: ThemeStyle;
  accent: AccentName;
  /** Light/dark choice: System, Light or Dark. */
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
  scheme: ColorScheme;
  colors: ThemeColors;
  /** Per-category tint: real colors in Color, grays in Black & White. */
  categoryColors: Record<CategoryColorToken, string>;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { theme: preference, themeStyle: style, accent } = usePreferences();
  const setPreference = (theme: ThemePreference) => updatePreferences({ theme });
  const system = useColorScheme();
  const scheme: ColorScheme =
    preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference;

  return (
    <ThemeContext
      value={{
        style,
        accent,
        preference,
        setPreference,
        scheme,
        colors: themeColors(style, scheme, accent),
        categoryColors: themeCategoryColors(style, scheme),
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
