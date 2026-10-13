import { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import { Duration, ReducedTiming } from '@/animation/tokens';
import { useTheme } from '@/theme/ThemeProvider';
import { Colors } from '@/theme/tokens';

/**
 * Light <-> dark switch: covers the screen with the previous background and fades it out,
 * so the new theme is revealed instead of snapping in.
 */
export function ThemeFade() {
  const { scheme } = useTheme();
  const previousBackground = Colors[scheme === 'dark' ? 'light' : 'dark'].background;
  const opacity = useSharedValue(0);
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    opacity.set(
      withSequence(
        withTiming(1, { duration: 0 }),
        withTiming(0, { ...ReducedTiming, duration: Duration.standard }),
      ),
    );
  }, [scheme, opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.get() }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { backgroundColor: previousBackground }, style]}
    />
  );
}
