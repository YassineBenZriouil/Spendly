import type { ReactNode } from 'react';
import { Pressable, Text } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, { interpolate, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { Icon } from '@/components/Icon';
import { t } from '@/i18n';
import { useTheme } from '@/theme/ThemeProvider';
import { FontScaleCap } from '@/theme/tokens';

import { styles } from './styles';

type AgainSwipeProps = {
  children: ReactNode;
  onAgain: () => void;
};

/**
 * Swipe a row to reveal "Again". Tapping it adds the copy and closes the row. Screen readers get the same action on
 * the row itself, and the edit screen has an Again button, so the swipe is never the only way.
 */
export function AgainSwipe({ children, onAgain }: AgainSwipeProps) {
  return (
    <ReanimatedSwipeable
      friction={2}
      rightThreshold={40}
      overshootRight={false}
      renderRightActions={(progress, _translation, swipeable) => (
        <AgainAction
          progress={progress}
          onPress={() => {
            swipeable.close();
            onAgain();
          }}
        />
      )}>
      {children}
    </ReanimatedSwipeable>
  );
}

function AgainAction({ progress, onPress }: { progress: SharedValue<number>; onPress: () => void }) {
  const { colors } = useTheme();
  // The action fades in as the row slides open
  const style = useAnimatedStyle(() => ({ opacity: interpolate(progress.get(), [0, 1], [0, 1], 'clamp') }));
  return (
    <Animated.View style={[styles.action, { backgroundColor: colors.accent }, style]}>
      <Pressable
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
        onPress={onPress}
        style={styles.pressable}>
        <Icon name="again" color={colors.onAccent} size={18} />
        <Text maxFontSizeMultiplier={FontScaleCap.control} style={[styles.label, { color: colors.onAccent }]}>
          {t('activity.row.again')}
        </Text>
      </Pressable>
    </Animated.View>
  );
}
