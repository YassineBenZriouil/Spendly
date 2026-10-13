import { StyleSheet } from 'react-native';

import { MinTouchTarget, Radius, Spacing, Typography } from '@/theme/tokens';

export const styles = StyleSheet.create({
  button: {
    minHeight: MinTouchTarget,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.pill,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: Typography.label,
});
