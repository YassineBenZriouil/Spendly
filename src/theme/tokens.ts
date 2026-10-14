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

/**
 * Black & White style (the default): pure black and white with grays only, following the system light/dark.
 * Success and danger are not colored here: their meaning is always also in an icon and words.
 */
export const MonoColors: Record<ColorScheme, ThemeColors> = {
  light: {
    background: '#FFFFFF',
    surface: '#F4F4F4',
    surfaceSecondary: '#E6E6E6',
    textPrimary: '#000000',
    textSecondary: '#595959',
    borderSubtle: '#D9D9D9',
    accent: '#000000',
    accentPressed: '#333333',
    onAccent: '#FFFFFF',
    success: '#000000',
    danger: '#000000',
    overlay: '#00000066',
    chart: '#000000',
  },
  dark: {
    background: '#000000',
    surface: '#121212',
    surfaceSecondary: '#262626',
    textPrimary: '#FFFFFF',
    textSecondary: '#A6A6A6',
    borderSubtle: '#333333',
    accent: '#FFFFFF',
    accentPressed: '#D9D9D9',
    onAccent: '#000000',
    success: '#FFFFFF',
    danger: '#FFFFFF',
    overlay: '#000000B3',
    chart: '#FFFFFF',
  },
};

/**
 * Categories in Black & White: no color, a gray per category instead (icon tint and chip fill), so neighbouring
 * categories still look different. Identity is always the icon and the label.
 */
export const MonoCategoryColors: Record<ColorScheme, Record<CategoryColorToken, string>> = {
  light: {
    coral: '#000000',
    blue: '#262626',
    green: '#404040',
    violet: '#595959',
    amber: '#6B6B6B',
    teal: '#000000',
    pink: '#262626',
    slate: '#404040',
    sky: '#595959',
    neutral: '#6B6B6B',
  },
  dark: {
    coral: '#FFFFFF',
    blue: '#E0E0E0',
    green: '#C7C7C7',
    violet: '#ADADAD',
    amber: '#969696',
    teal: '#FFFFFF',
    pink: '#E0E0E0',
    slate: '#C7C7C7',
    sky: '#ADADAD',
    neutral: '#969696',
  },
};

/** Black & White (default) or the colored palettes with a chosen accent. */
export type ThemeStyle = 'mono' | 'color';

export const AccentNames = ['lime', 'blue', 'violet', 'coral', 'teal', 'amber'] as const;
export type AccentName = (typeof AccentNames)[number];

type AccentColors = Pick<ThemeColors, 'accent' | 'accentPressed' | 'onAccent'>;

/** Accents for the Color style. Text on each passes 4.5:1, pressed or not (contrast-test). */
export const Accents: Record<AccentName, Record<ColorScheme, AccentColors>> = {
  lime: {
    light: { accent: '#C8F169', accentPressed: '#B2DC54', onAccent: '#171914' },
    dark: { accent: '#C8F169', accentPressed: '#B2DC54', onAccent: '#171914' },
  },
  blue: {
    light: { accent: '#2F5FD0', accentPressed: '#244DB0', onAccent: '#FFFFFF' },
    dark: { accent: '#8DB0FF', accentPressed: '#A9C3FF', onAccent: '#0B1226' },
  },
  violet: {
    light: { accent: '#6A47D6', accentPressed: '#5636B8', onAccent: '#FFFFFF' },
    dark: { accent: '#B8A3FF', accentPressed: '#CABAFF', onAccent: '#140C2E' },
  },
  coral: {
    light: { accent: '#C2412B', accentPressed: '#A43320', onAccent: '#FFFFFF' },
    dark: { accent: '#FF9B84', accentPressed: '#FFB4A3', onAccent: '#2A0D06' },
  },
  teal: {
    light: { accent: '#0B7268', accentPressed: '#085C54', onAccent: '#FFFFFF' },
    dark: { accent: '#6ED6CA', accentPressed: '#8FE2D8', onAccent: '#04211E' },
  },
  amber: {
    light: { accent: '#F2B43A', accentPressed: '#DBA02A', onAccent: '#1F1500' },
    dark: { accent: '#F2B43A', accentPressed: '#F7C766', onAccent: '#1F1500' },
  },
};

/** The colors for a style, light/dark and accent (the accent only applies to the Color style). */
export function themeColors(style: ThemeStyle, scheme: ColorScheme, accent: AccentName): ThemeColors {
  return style === 'mono' ? MonoColors[scheme] : { ...Colors[scheme], ...Accents[accent][scheme] };
}

export function themeCategoryColors(style: ThemeStyle, scheme: ColorScheme): Record<CategoryColorToken, string> {
  return style === 'mono' ? MonoCategoryColors[scheme] : CategoryColors[scheme];
}

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
