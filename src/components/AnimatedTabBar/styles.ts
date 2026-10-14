import { StyleSheet } from 'react-native';

import { MinTouchTarget, Radius, Spacing, Typography } from '@/theme/tokens';

export const styles = StyleSheet.create({
  bar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
  },
  indicator: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
  },
  pill: {
    flex: 1,
    marginHorizontal: Spacing.lg,
    borderRadius: Radius.pill,
  },
  selectedIcon: {
    ...StyleSheet.absoluteFill,
  },
  item: {
    flex: 1,
    minHeight: MinTouchTarget + Spacing.sm,
  },
  itemContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: Spacing.xs,
  },
  label: {
    ...Typography.caption,
    fontWeight: '500',
  },
});
