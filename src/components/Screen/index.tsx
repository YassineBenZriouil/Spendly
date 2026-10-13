import type { ReactNode } from 'react';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/ThemeProvider';

import { styles } from './styles';

type ScreenProps = {
  children: ReactNode;
  /** Tab screens sit above the tab bar, so they only need the top inset. */
  edges?: Edge[];
};

export function Screen({ children, edges = ['top'] }: ScreenProps) {
  const { colors } = useTheme();
  return (
    <SafeAreaView edges={edges} style={[styles.screen, { backgroundColor: colors.background }]}>
      {children}
    </SafeAreaView>
  );
}
