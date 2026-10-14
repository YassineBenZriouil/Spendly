import { StyleSheet } from 'react-native';

import { ListGap, Spacing, Typography } from '@/theme/tokens';

export const styles = StyleSheet.create({
  content: {
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  sections: {
    gap: Spacing.xl,
  },
  section: {
    gap: ListGap,
  },
  sectionTitle: {
    ...Typography.caption,
    textTransform: 'uppercase',
  },
  note: Typography.caption,
  body: Typography.body,
  /** Links always read left to right, also in Arabic. */
  link: {
    ...Typography.body,
    writingDirection: 'ltr',
  },
  buttons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
});
