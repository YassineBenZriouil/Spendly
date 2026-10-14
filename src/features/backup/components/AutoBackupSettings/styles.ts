import { StyleSheet } from 'react-native';

import { Spacing, Typography } from '@/theme/tokens';

export const styles = StyleSheet.create({
  status: {
    gap: Spacing.sm,
    alignItems: 'flex-start',
  },
  note: Typography.caption,
});
