import { SymbolView } from 'expo-symbols';
import { I18nManager, Platform, StyleSheet, type ColorValue } from 'react-native';

/** Stable icon keys -> SF Symbols (iOS) / Material Symbols (Android, web). Outline variants only. */
const icons = {
  add: { ios: 'plus.circle', android: 'add_circle', web: 'add_circle' },
  activity: { ios: 'list.bullet', android: 'list', web: 'list' },
  insights: { ios: 'chart.bar', android: 'bar_chart', web: 'bar_chart' },
  settings: { ios: 'gearshape', android: 'settings', web: 'settings' },

  plus: { ios: 'plus', android: 'add', web: 'add' },
  minus: { ios: 'minus', android: 'remove', web: 'remove' },
  keypad: { ios: 'number', android: 'dialpad', web: 'dialpad' },
  reset: { ios: 'arrow.counterclockwise', android: 'restart_alt', web: 'restart_alt' },
  backspace: { ios: 'delete.left', android: 'backspace', web: 'backspace' },
  check: { ios: 'checkmark', android: 'check', web: 'check' },
  dragHint: { ios: 'arrow.up.arrow.down', android: 'swap_vert', web: 'swap_vert' },
  close: { ios: 'xmark', android: 'close', web: 'close' },
  error: { ios: 'exclamationmark.circle', android: 'error', web: 'error' },
  details: { ios: 'square.and.pencil', android: 'edit_note', web: 'edit_note' },
  search: { ios: 'magnifyingglass', android: 'search', web: 'search' },
  delete: { ios: 'trash', android: 'delete', web: 'delete' },
  calendar: { ios: 'calendar', android: 'calendar_today', web: 'calendar_today' },
  lock: { ios: 'lock', android: 'lock', web: 'lock' },

  // Category icons (keys match CategoryIcon)
  food: { ios: 'fork.knife', android: 'restaurant', web: 'restaurant' },
  transport: { ios: 'car', android: 'directions_car', web: 'directions_car' },
  groceries: { ios: 'cart', android: 'shopping_cart', web: 'shopping_cart' },
  shopping: { ios: 'bag', android: 'shopping_bag', web: 'shopping_bag' },
  bills: { ios: 'doc.text', android: 'receipt_long', web: 'receipt_long' },
  health: { ios: 'heart', android: 'favorite', web: 'favorite' },
  entertainment: { ios: 'film', android: 'movie', web: 'movie' },
  home: { ios: 'house', android: 'home', web: 'home' },
  travel: { ios: 'airplane', android: 'flight', web: 'flight' },
  other: { ios: 'square.grid.2x2', android: 'category', web: 'category' },
  coffee: { ios: 'cup.and.saucer', android: 'local_cafe', web: 'local_cafe' },
  gift: { ios: 'gift', android: 'redeem', web: 'redeem' },
  pets: { ios: 'pawprint', android: 'pets', web: 'pets' },
  education: { ios: 'book', android: 'school', web: 'school' },
  fitness: { ios: 'figure.run', android: 'fitness_center', web: 'fitness_center' },
  fuel: { ios: 'fuelpump', android: 'local_gas_station', web: 'local_gas_station' },
  phone: { ios: 'iphone', android: 'smartphone', web: 'smartphone' },
  beauty: { ios: 'sparkles', android: 'spa', web: 'spa' },
  savings: { ios: 'banknote', android: 'savings', web: 'savings' },
  music: { ios: 'music.note', android: 'music_note', web: 'music_note' },
  work: { ios: 'briefcase', android: 'work', web: 'work' },

  // Settings and category management
  chevronLeft: { ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' },
  chevronRight: { ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' },
  export: { ios: 'square.and.arrow.up', android: 'ios_share', web: 'ios_share' },
  arrowUp: { ios: 'arrow.up', android: 'arrow_upward', web: 'arrow_upward' },
  arrowDown: { ios: 'arrow.down', android: 'arrow_downward', web: 'arrow_downward' },
  hidden: { ios: 'eye.slash', android: 'visibility_off', web: 'visibility_off' },
  backup: { ios: 'archivebox', android: 'archive', web: 'archive' },
  insight: { ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' },
  again: { ios: 'arrow.clockwise', android: 'replay', web: 'replay' },
  repeat: { ios: 'repeat', android: 'repeat', web: 'repeat' },
  restore: { ios: 'clock.arrow.circlepath', android: 'settings_backup_restore', web: 'settings_backup_restore' },
} as const;

export type IconName = keyof typeof icons;

type IconProps = {
  name: IconName;
  color: ColorValue;
  size?: number;
};

/** Icons that point along the reading direction, so they flip in right-to-left languages. */
const DIRECTIONAL = new Set<IconName>(['chevronLeft', 'chevronRight']);
// SF Symbols mirror directional symbols in right-to-left layouts on their own; Material Symbols don't
const mirror = I18nManager.isRTL && Platform.OS !== 'ios';

export function Icon({ name, color, size = 24 }: IconProps) {
  return (
    <SymbolView
      name={icons[name]}
      tintColor={color}
      size={size}
      style={mirror && DIRECTIONAL.has(name) ? styles.mirrored : undefined}
    />
  );
}

const styles = StyleSheet.create({
  mirrored: { transform: [{ scaleX: -1 }] },
});
