import { StyleSheet } from 'react-native';

import { Radius, Spacing, Typography } from '@/theme/tokens';

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
    height: 72,
  },
  amountLayer: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
  },
  amount: Typography.amount,
  sectionTitle: {
    ...Typography.caption,
    textTransform: 'uppercase',
    marginTop: Spacing.sm,
  },
  error: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.md,
  },
  errorText: {
    ...Typography.body,
    flex: 1,
  },
  actions: {
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
});
