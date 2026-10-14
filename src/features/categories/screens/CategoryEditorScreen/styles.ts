import { StyleSheet } from 'react-native';

import { Radius, Spacing, Typography } from '@/theme/tokens';

export const styles = StyleSheet.create({
  content: {
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  sections: {
    gap: Spacing.md,
  },
  previewSlot: {
    alignSelf: 'center',
    width: 72,
    height: 72,
  },
  preview: {
    ...StyleSheet.absoluteFill,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    ...Typography.caption,
    textTransform: 'uppercase',
    marginTop: Spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  note: Typography.caption,
});
