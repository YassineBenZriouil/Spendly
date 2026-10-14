import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import { Duration, ReducedTiming } from '@/animation/tokens';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * Any look change (style, light/dark, accent): covers the screen with the previous background and fades it out,
 * so the new look is revealed instead of snapping in (also when only the accent changed and the background didn't).
 */
export function ThemeFade() {
  const { style, scheme, accent, colors } = useTheme();
  const look = `${style}:${scheme}:${accent}`;
  const opacity = useSharedValue(0);

  // Adjusted during render, not in an effect: each change records the background it replaces
  const [change, setChange] = useState({ look, background: colors.background, cover: colors.background, count: 0 });
  if (change.look !== look) {
    setChange({ look, background: colors.background, cover: change.background, count: change.count + 1 });
  }

  useEffect(() => {
    if (change.count === 0) return;
    opacity.set(withSequence(withTiming(1, { duration: 0 }), withTiming(0, { ...ReducedTiming, duration: Duration.standard })));
  }, [change.count, opacity]);

  const fadeStyle = useAnimatedStyle(() => ({ opacity: opacity.get() }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { backgroundColor: change.cover }, fadeStyle]}
    />
  );
}
