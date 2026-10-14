import { StyleSheet } from 'react-native';

import { ListGap, Spacing, Typography } from '@/theme/tokens';

export const styles = StyleSheet.create({
  content: {
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  separator: {
    height: ListGap,
  },
  note: {
    ...Typography.caption,
    marginBottom: Spacing.md,
  },
});
