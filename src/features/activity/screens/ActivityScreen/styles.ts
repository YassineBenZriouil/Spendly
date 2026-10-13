import { StyleSheet } from 'react-native';

import { Radius, Spacing, Typography } from '@/theme/tokens';

export const styles = StyleSheet.create({
  title: {
    ...Typography.title,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  filters: {
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  chips: {
    gap: Spacing.sm,
  },
  body: {
    flex: 1,
  },
  bodyLayer: {
    ...StyleSheet.absoluteFill,
  },
  listContent: {
    paddingBottom: Spacing.xl,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  undoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingLeft: Spacing.lg,
    paddingRight: Spacing.xs,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.pill,
    marginBottom: Spacing.sm,
  },
  undoText: {
    ...Typography.body,
    flex: 1,
  },
});
