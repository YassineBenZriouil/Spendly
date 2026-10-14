import { StyleSheet } from 'react-native';

import { Spacing } from '@/theme/tokens';

export const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingVertical: Spacing.sm,
  },
  photo: {
    flex: 1,
    marginBottom: Spacing.lg,
  },
});
