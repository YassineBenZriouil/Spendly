import { Tabs } from 'expo-router';
import { Easing } from 'react-native';

import { useReducedMotion } from '@/animation/reducedMotion';
import { Duration } from '@/animation/tokens';
import { AnimatedTabBar } from '@/components/AnimatedTabBar';
import { Icon } from '@/components/Icon';

export default function TabLayout() {
  const reducedMotion = useReducedMotion();

  return (
    <Tabs
      tabBar={(props) => <AnimatedTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        // Screens slide + fade between tabs; reduced motion keeps only the fade
        animation: reducedMotion ? 'fade' : 'shift',
        transitionSpec: {
          animation: 'timing',
          config: { duration: Duration.standard, easing: Easing.out(Easing.cubic) },
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Add',
          tabBarIcon: ({ color, size }) => <Icon name="add" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: 'Activity',
          tabBarIcon: ({ color, size }) => <Icon name="activity" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: 'Insights',
          tabBarIcon: ({ color, size }) => <Icon name="insights" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
