import { StyleSheet } from 'react-native';

import { Radius, Spacing, Typography } from '@/theme/tokens';

export const styles = StyleSheet.create({
  wrapper: {
    gap: Spacing.sm,
  },
  card: {
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    gap: Spacing.sm,
  },
  title: {
    ...Typography.caption,
    textTransform: 'uppercase',
  },
  line: Typography.body,
  note: Typography.caption,
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
});
