import { StyleSheet } from 'react-native';

import { Spacing, Typography } from '@/theme/tokens';

export const styles = StyleSheet.create({
  content: {
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  sections: {
    gap: Spacing.md,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  amountSlot: {
    flex: 1,
  },
  sectionTitle: {
    ...Typography.caption,
    textTransform: 'uppercase',
    marginTop: Spacing.sm,
  },
  actions: {
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
});
