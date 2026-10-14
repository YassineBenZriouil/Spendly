import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets, type Edge } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/ThemeProvider';
import { ScreenGutter } from '@/theme/tokens';

import { styles } from './styles';

type ScreenProps = {
  children: ReactNode;
  /**
   * Which system bars to keep clear of. Tab screens sit above the tab bar, so they only need the top;
   * pushed screens with a header only need the bottom; full-screen modals need both.
   */
  edges?: Edge[];
};

/**
 * Insets come from the app-root provider (via the hook), not the native SafeAreaView: inside a freshly
 * presented modal the native view can miss the status bar and draw content under it.
 */
export function Screen({ children, edges = ['top'] }: ScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const inset = (edge: Edge) => (edges.includes(edge) ? insets[edge] : 0);

  return (
    <View
      style={[
        styles.screen,
        {
          backgroundColor: colors.background,
          paddingTop: inset('top'),
          paddingBottom: inset('bottom'),
          paddingLeft: ScreenGutter + inset('left'),
          paddingRight: ScreenGutter + inset('right'),
        },
      ]}>
      {children}
    </View>
  );
}
