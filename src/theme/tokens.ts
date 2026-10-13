import type { TextStyle } from 'react-native';

export type ColorScheme = 'light' | 'dark';

const light = {
  background: '#F6F5F0',
  surface: '#FFFFFF',
  surfaceSecondary: '#ECECE5',
  textPrimary: '#171914',
  textSecondary: '#6D7067',
  borderSubtle: '#E0E1D8',
  accent: '#C8F169',
  accentPressed: '#B2DC54',
  onAccent: '#171914',
  success: '#267A4B',
  danger: '#C43D37',
  overlay: '#17191466',
};

export type ThemeColors = typeof light;

const dark: ThemeColors = {
  background: '#11130F',
  surface: '#1B1E18',
  surfaceSecondary: '#272B23',
  textPrimary: '#F3F4EC',
  textSecondary: '#A5AA9B',
  borderSubtle: '#34392F',
  accent: '#C8F169',
  accentPressed: '#B2DC54',
  onAccent: '#171914',
  success: '#7AD9A0',
  danger: '#FF817A',
  overlay: '#00000099',
};

export const Colors: Record<ColorScheme, ThemeColors> = { light, dark };

export type CategoryColorToken =
  | 'coral'
  | 'blue'
  | 'green'
  | 'violet'
  | 'amber'
  | 'teal'
  | 'pink'
  | 'slate'
  | 'sky'
  | 'neutral';

export const CategoryColors: Record<ColorScheme, Record<CategoryColorToken, string>> = {
  light: {
    coral: '#D9694F',
    blue: '#4A74C9',
    green: '#3F8F55',
    violet: '#8065C9',
    amber: '#C08A23',
    teal: '#2A8C84',
    pink: '#C95A8C',
    slate: '#5F6B78',
    sky: '#3593C4',
    neutral: '#7D8077',
  },
  dark: {
    coral: '#F09A84',
    blue: '#8DACEB',
    green: '#86CC97',
    violet: '#B5A2EE',
    amber: '#EBC170',
    teal: '#74CFC6',
    pink: '#EE9CC0',
    slate: '#A9B4C0',
    sky: '#86C7EA',
    neutral: '#B3B6AC',
  },
};

export const Spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const Radius = { sm: 8, md: 12, lg: 20, xl: 28, pill: 999 } as const;

/** Minimum touch target: 44pt on iOS, 48dp on Android. */
export const MinTouchTarget = 48;

export const Typography = {
  amount: { fontSize: 56, fontWeight: '600', fontVariant: ['tabular-nums'], letterSpacing: -1 },
  title: { fontSize: 22, fontWeight: '600' },
  label: { fontSize: 15, fontWeight: '500' },
  body: { fontSize: 16, fontWeight: '400' },
  caption: { fontSize: 13, fontWeight: '400' },
} satisfies Record<string, TextStyle>;
