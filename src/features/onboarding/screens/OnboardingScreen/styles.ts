import { StyleSheet } from 'react-native';

import { Radius, Spacing, Typography } from '@/theme/tokens';

export const styles = StyleSheet.create({
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    paddingTop: Spacing.md,
  },
  title: {
    ...Typography.title,
    flex: 1,
  },
  body: {
    flex: 1,
    gap: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  instruction: {
    gap: Spacing.xs,
  },
  stepCount: {
    ...Typography.caption,
    textTransform: 'uppercase',
  },
  stepTitle: Typography.title,
  stepHint: Typography.body,
  composer: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    gap: Spacing.md,
  },
  amount: {
    flex: 1,
    minHeight: 120,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.lg,
  },
  footer: {
    paddingVertical: Spacing.md,
  },
});
