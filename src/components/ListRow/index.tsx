import type { ReactNode } from 'react';
import { Pressable, Text, View, type AccessibilityActionEvent, type AccessibilityActionInfo } from 'react-native';
import Animated, { interpolate, interpolateColor, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { useReducedMotion } from '@/animation/reducedMotion';

import { fade, settleTo } from '@/animation/transitions';
import { Icon, type IconName } from '@/components/Icon';
import { useTheme } from '@/theme/ThemeProvider';

import { styles } from './styles';

type ListRowProps = {
  label: string;
  /** Secondary line under the label. */
  caption?: string;
  /** Current value shown on the right (e.g. "EUR"). */
  value?: string;
  icon?: IconName;
  iconColor?: string;
  /** Pressable rows get press feedback and a chevron. */
  onPress?: () => void;
  /** Controls on the right (switches, buttons). */
  accessory?: ReactNode;
  accessibilityHint?: string;
  /** Extra screen-reader actions (e.g. move up/down as the alternative to dragging). */
  accessibilityActions?: AccessibilityActionInfo[];
  onAccessibilityAction?: (event: AccessibilityActionEvent) => void;
};

/** A settings / management row. */
export function ListRow({
  label,
  caption,
  value,
  icon,
  iconColor,
  onPress,
  accessory,
  accessibilityHint,
  accessibilityActions,
  onAccessibilityAction,
}: ListRowProps) {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const pressed = useSharedValue(0);

  const rowStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(pressed.get(), [0, 1], [colors.surface, colors.surfaceSecondary]),
    transform: [{ scale: reducedMotion ? 1 : interpolate(pressed.get(), [0, 1], [1, 0.98]) }],
  }));

  const content = (
    <Animated.View style={[styles.row, rowStyle]}>
      {icon && (
        <View style={[styles.icon, { backgroundColor: colors.surfaceSecondary }]}>
          <Icon name={icon} color={iconColor ?? colors.textPrimary} size={18} />
        </View>
      )}
      <View style={styles.text}>
        <Text numberOfLines={1} style={[styles.label, { color: colors.textPrimary }]}>
          {label}
        </Text>
        {caption && (
          <Animated.Text {...fade} numberOfLines={2} style={[styles.caption, { color: colors.textSecondary }]}>
            {caption}
          </Animated.Text>
        )}
      </View>
      {/* Keyed so a changed value (e.g. a new currency) fades in */}
      {value && (
        <Animated.Text key={value} entering={fade.entering} style={[styles.value, { color: colors.textSecondary }]}>
          {value}
        </Animated.Text>
      )}
      {/* Own box so the row centers it: RN's iOS Switch sets alignSelf: 'flex-start' on itself, which would
          otherwise pin it to the top of the row */}
      {accessory && <View style={styles.accessory}>{accessory}</View>}
      {onPress && <Icon name="chevronRight" color={colors.textSecondary} size={14} />}
    </Animated.View>
  );

  if (!onPress) return content;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={value ? `${label}, ${value}` : label}
      accessibilityHint={accessibilityHint}
      accessibilityActions={accessibilityActions}
      onAccessibilityAction={onAccessibilityAction}
      onPress={onPress}
      onPressIn={() => pressed.set(settleTo(1, reducedMotion))}
      onPressOut={() => pressed.set(settleTo(0, reducedMotion))}>
      {content}
    </Pressable>
  );
}
