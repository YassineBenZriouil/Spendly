import { StyleSheet } from 'react-native';

import { MinTouchTarget, Radius } from '@/theme/tokens';

export const styles = StyleSheet.create({
  button: {
    width: MinTouchTarget,
    height: MinTouchTarget,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
