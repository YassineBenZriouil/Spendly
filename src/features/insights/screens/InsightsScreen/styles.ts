import { StyleSheet } from 'react-native';

import { MinTouchTarget, Radius, Spacing, Typography } from '@/theme/tokens';

export const styles = StyleSheet.create({
  title: {
    ...Typography.title,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  controls: {
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  periodNav: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  periodSlot: {
    flex: 1,
    height: 24,
  },
  period: {
    ...Typography.label,
    textAlign: 'center',
    position: 'absolute',
    left: 0,
    right: 0,
  },
  body: {
    flex: 1,
  },
  bodyLayer: {
    ...StyleSheet.absoluteFill,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    gap: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  card: {
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    gap: Spacing.sm,
  },
  cardTitle: {
    ...Typography.caption,
    textTransform: 'uppercase',
  },
  totalSlot: {
    minHeight: 56,
    justifyContent: 'center',
  },
  noTotal: Typography.title,
  comparison: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  note: Typography.caption,
  net: {
    gap: Spacing.xs,
  },
  netState: Typography.label,
  highlights: {
    gap: Spacing.md,
  },
  highlightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: MinTouchTarget,
  },
  highlightText: {
    ...Typography.body,
    flex: 1,
  },
});
