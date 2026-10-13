import { SymbolView } from 'expo-symbols';
import type { ColorValue } from 'react-native';

/** Stable icon keys -> SF Symbols (iOS) / Material Symbols (Android, web). Outline variants only. */
const icons = {
  add: { ios: 'plus.circle', android: 'add_circle', web: 'add_circle' },
  activity: { ios: 'list.bullet', android: 'list', web: 'list' },
  insights: { ios: 'chart.bar', android: 'bar_chart', web: 'bar_chart' },
  settings: { ios: 'gearshape', android: 'settings', web: 'settings' },
} as const;

export type IconName = keyof typeof icons;

type IconProps = {
  name: IconName;
  color: ColorValue;
  size?: number;
};

export function Icon({ name, color, size = 24 }: IconProps) {
  return <SymbolView name={icons[name]} tintColor={color} size={size} />;
}
