import { StyleSheet } from 'react-native';

import { Spacing, Typography } from '@/theme/tokens';

export const styles = StyleSheet.create({
  content: {
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  sections: {
    gap: Spacing.xl,
  },
  section: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.caption,
    textTransform: 'uppercase',
  },
  setting: {
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  settingLabel: Typography.body,
  dataRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  note: Typography.caption,
});
