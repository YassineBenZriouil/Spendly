import { StyleSheet } from 'react-native';

import { Spacing, Typography } from '@/theme/tokens';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  title: Typography.title,
  message: {
    ...Typography.body,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
});
