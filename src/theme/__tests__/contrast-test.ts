import { CategoryColors, Colors, type ColorScheme, type ThemeColors } from '../tokens';

/** WCAG 2.x contrast ratio between two #RRGGBB colors. */
function contrast(a: string, b: string) {
  const luminance = (hex: string) => {
    const [r, g, b] = [1, 3, 5].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

const schemes: ColorScheme[] = ['light', 'dark'];
const surfaces: (keyof ThemeColors)[] = ['background', 'surface', 'surfaceSecondary'];

describe.each(schemes)('%s theme contrast (WCAG AA)', (scheme) => {
  const colors = Colors[scheme];

  it.each(['textPrimary', 'textSecondary', 'danger', 'success'] as const)('%s text: 4.5:1 on every surface', (text) => {
    for (const surface of surfaces) expect(contrast(colors[text], colors[surface])).toBeGreaterThanOrEqual(4.5);
  });

  it('text on the accent: 4.5:1, pressed or not', () => {
    expect(contrast(colors.onAccent, colors.accent)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(colors.onAccent, colors.accentPressed)).toBeGreaterThanOrEqual(4.5);
  });

  it('chart marks: 3:1 on the card surface', () => {
    expect(contrast(colors.chart, colors.surface)).toBeGreaterThanOrEqual(3);
  });

  it.each(Object.keys(CategoryColors[scheme]))('category icon %s: 3:1 on its tile', (token) => {
    const color = CategoryColors[scheme][token as keyof (typeof CategoryColors)['light']];
    expect(contrast(color, colors.surfaceSecondary)).toBeGreaterThanOrEqual(3);
  });

  // The white composer surface is the brand spec (IDENTITY.md); the canvas behind it never is
  it('the canvas is never pure black or pure white', () => {
    for (const surface of ['background', 'surfaceSecondary'] as const) {
      expect(['#000000', '#FFFFFF']).not.toContain(colors[surface].toUpperCase());
    }
  });
});
