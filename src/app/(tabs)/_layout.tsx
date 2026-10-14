import { router, Tabs } from 'expo-router';
import { useEffect } from 'react';
import { Easing } from 'react-native';

import { useReducedMotion } from '@/animation/reducedMotion';
import { Duration } from '@/animation/tokens';
import { AnimatedTabBar } from '@/components/AnimatedTabBar';
import { Icon } from '@/components/Icon';
import { getPreferences } from '@/storage/preferences/preferences';
import { t } from '@/i18n';

export default function TabLayout() {
  const reducedMotion = useReducedMotion();

  // First launch: the short interactive introduction, once (Settings can replay it)
  useEffect(() => {
    if (!getPreferences().onboardingSeen) router.push('/onboarding');
  }, []);

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
          title: t('common.tab.add'),
          tabBarIcon: ({ color, size }) => <Icon name="add" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: t('common.tab.activity'),
          tabBarIcon: ({ color, size }) => <Icon name="activity" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: t('common.tab.insights'),
          tabBarIcon: ({ color, size }) => <Icon name="insights" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
