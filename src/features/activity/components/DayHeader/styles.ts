import { StyleSheet } from 'react-native';

import { Spacing, Typography } from '@/theme/tokens';

export const styles = StyleSheet.create({
  header: {
    // Fixed height (DAY_HEADER_HEIGHT) so the list can skip measuring
    height: 44,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: Spacing.md,
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  label: {
    ...Typography.caption,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  totalSlot: {
    flex: 1,
    alignSelf: 'stretch',
  },
  total: {
    ...Typography.caption,
    fontVariant: ['tabular-nums'],
    // Old and new totals overlap while cross-fading
    position: 'absolute',
    right: 0,
    bottom: 0,
  },
});
