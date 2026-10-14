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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  name: {
    ...Typography.body,
    flex: 1,
  },
  amount: {
    width: '45%',
  },
});
