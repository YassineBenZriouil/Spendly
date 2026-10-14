import { StyleSheet } from 'react-native';

import { Spacing } from '@/theme/tokens';

export const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  plus: {
    includeFontPadding: false,
  },
});
