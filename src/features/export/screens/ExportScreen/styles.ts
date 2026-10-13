import { StyleSheet } from 'react-native';

import { Radius, Spacing, Typography } from '@/theme/tokens';

export const styles = StyleSheet.create({
  content: {
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  sections: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.caption,
    textTransform: 'uppercase',
    marginTop: Spacing.md,
  },
  countSlot: {
    height: 24,
    justifyContent: 'center',
  },
  countText: {
    // Old and new counts overlap while cross-fading
    position: 'absolute',
    left: 0,
    right: 0,
  },
  body: Typography.body,
  note: Typography.caption,
  message: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginTop: Spacing.md,
  },
  messageText: {
    ...Typography.body,
    flex: 1,
  },
});
