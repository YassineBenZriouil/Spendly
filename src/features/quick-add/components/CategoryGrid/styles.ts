import { StyleSheet } from 'react-native';

import { Spacing } from '@/theme/tokens';

export const styles = StyleSheet.create({
  grid: {
    gap: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  spacer: {
    flex: 1,
  },
});
