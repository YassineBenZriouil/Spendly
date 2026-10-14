import { StyleSheet } from 'react-native';

import { Radius, Spacing, Typography } from '@/theme/tokens';

const THUMBNAIL_SIZE = 64;

export const styles = StyleSheet.create({
  field: {
    gap: Spacing.sm,
  },
  /** Same height in every state, so the fields below never jump while it cross-fades. */
  row: {
    minHeight: THUMBNAIL_SIZE,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  thumbnail: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    borderRadius: Radius.md,
  },
  caption: Typography.caption,
});
