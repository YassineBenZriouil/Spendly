import { StyleSheet } from 'react-native';

import { Spacing, Typography } from '@/theme/tokens';

export const styles = StyleSheet.create({
  fields: {
    gap: Spacing.sm,
  },
  repeat: {
    gap: Spacing.xs,
  },
  repeatNote: Typography.caption,
});
