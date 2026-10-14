import { StyleSheet } from 'react-native';

import { Spacing, Typography } from '@/theme/tokens';

export const styles = StyleSheet.create({
  content: {
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxl,
    gap: Spacing.md,
  },
  note: Typography.caption,
  actions: {
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
});
