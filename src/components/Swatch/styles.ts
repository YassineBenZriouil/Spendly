import { StyleSheet } from 'react-native';

import { MinTouchTarget, Radius } from '@/theme/tokens';

export const styles = StyleSheet.create({
  ring: {
    width: MinTouchTarget,
    height: MinTouchTarget,
    borderRadius: Radius.pill,
    borderWidth: 2,
    padding: 3,
  },
  fill: {
    flex: 1,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
