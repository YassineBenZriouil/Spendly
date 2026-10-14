import type { TextStyle } from 'react-native';

export type ColorScheme = 'light' | 'dark';

const light = {
  background: '#F6F5F0',
  surface: '#FFFFFF',
  surfaceSecondary: '#ECECE5',
  textPrimary: '#171914',
  textSecondary: '#62655C',
  borderSubtle: '#E0E1D8',
  accent: '#C8F169',
  accentPressed: '#B2DC54',
  onAccent: '#171914',
  success: '#226F44',
  danger: '#B83630',
  overlay: '#17191466',
  /** Single-series chart marks: >= 3:1 against surface (checked with the dataviz validator). */
  chart: '#5A7A22',
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
  chart: '#C8F169',
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
    coral: '#CE644B',
    blue: '#4A74C9',
    green: '#3F8F55',
    violet: '#8065C9',
    amber: '#AB7B1F',
    teal: '#2A8C84',
    pink: '#C95A8C',
    slate: '#5F6B78',
    sky: '#328CBA',
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

/** Side margin of every screen: `Screen` pads its content by this. */
export const ScreenGutter = Spacing.lg;

/**
 * For everything that scrolls (vertically or sideways): span the full screen width and pad the content back in by the
 * gutter. Content lines up with the rest of the screen, but nothing is cut at the gutter: horizontal rows run to the
 * screen edges, and enlarged or lifted rows and their shadows have room.
 */
export const EdgeToEdge = {
  /** On the ScrollView / FlatList itself. */
  scroll: { marginHorizontal: -ScreenGutter },
  /** On its `contentContainerStyle`. */
  content: { paddingHorizontal: ScreenGutter },
} as const;

/** Space between stacked cards (ListRow and other filled rows). Cards never touch: use this, never 0. */
export const ListGap = Spacing.sm;

export const Radius = { sm: 8, md: 12, lg: 20, xl: 28, pill: 999 } as const;

/**
 * Largest system font scale for text inside fixed-size controls (tab bar, tiles, keys, fixed-height rows),
 * so the largest accessibility sizes enlarge text without clipping it. Free-flowing text is never capped.
 */
export const FontScaleCap = { tight: 1.3, control: 1.5 } as const;

/** Minimum touch target: 44pt on iOS, 48dp on Android. */
export const MinTouchTarget = 48;

/** Text styles (system font). Every text in the app uses one of these; no ad-hoc font sizes. */
export const Typography = {
  title: { fontSize: 22, fontWeight: '600' },
  label: { fontSize: 15, fontWeight: '500' },
  body: { fontSize: 16, fontWeight: '400' },
  caption: { fontSize: 13, fontWeight: '400' },
  /** Chart axis and tile labels. */
  micro: { fontSize: 11, fontWeight: '500' },
} satisfies Record<string, TextStyle>;

/**
 * Typeface for every amount and total (via `AnimatedNumber`): Space Grotesk SemiBold, embedded at build time by the
 * expo-font plugin (app.json). Its PostScript name (iOS) and file name (Android) are both `SpaceGrotesk-SemiBold`.
 * Metrics are read from the font file, as fractions of the font size, so digits can be laid out without measuring.
 */
export const NumberFont = {
  family: 'SpaceGrotesk-SemiBold',
  ascent: 0.984,
  descent: 0.292,
  /** Widest digit ("0"): every digit gets this width, so numbers never shift sideways. */
  digitWidth: 0.646,
  /** Room for a group or decimal separator. */
  separatorWidth: 0.3,
} as const;

/** Sizes for numbers: `hero` is the amount being entered; the rest follow the text scale. */
export const NumberSize = {
  hero: 56,
  display: 40,
  title: 28,
  label: 15,
  caption: 13,
} as const;

export type NumberSizeName = keyof typeof NumberSize;
