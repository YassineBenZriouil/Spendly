import { Text } from 'react-native';
import Animated, { type BaseAnimationBuilder } from 'react-native-reanimated';

import { fade } from '@/animation/transitions';
import { Icon } from '@/components/Icon';
import { useTheme } from '@/theme/ThemeProvider';

import { styles } from './styles';

type ErrorBannerProps = {
  message: string;
  /** Defaults to the shared fade. */
  entering?: BaseAnimationBuilder;
  exiting?: BaseAnimationBuilder;
};

/** Inline error that appears where the problem is; render it conditionally so it animates in and out. */
export function ErrorBanner({ message, entering = fade.entering, exiting = fade.exiting }: ErrorBannerProps) {
  const { colors } = useTheme();
  return (
    <Animated.View
      entering={entering}
      exiting={exiting}
      accessibilityLiveRegion="polite"
      style={[styles.banner, { backgroundColor: colors.surfaceSecondary }]}>
      <Icon name="error" color={colors.danger} size={18} />
      <Text style={[styles.text, { color: colors.textPrimary }]}>{message}</Text>
    </Animated.View>
  );
}
