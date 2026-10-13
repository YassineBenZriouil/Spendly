import { Text } from 'react-native';
import Animated from 'react-native-reanimated';

import { useEnterTransition } from '@/animation/transitions';
import { Button } from '@/components/Button';
import { Icon, type IconName } from '@/components/Icon';
import { useTheme } from '@/theme/ThemeProvider';

import { styles } from './styles';

type EmptyStateProps = {
  icon: IconName;
  title: string;
  message: string;
  action?: { label: string; onPress: () => void };
};

export function EmptyState({ icon, title, message, action }: EmptyStateProps) {
  const { colors } = useTheme();
  const entering = useEnterTransition();
  return (
    <Animated.View entering={entering} style={styles.container}>
      <Icon name={icon} color={colors.textSecondary} size={40} />
      <Text accessibilityRole="header" style={[styles.title, { color: colors.textPrimary }]}>
        {title}
      </Text>
      <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
      {action && <Button label={action.label} onPress={action.onPress} />}
    </Animated.View>
  );
}
