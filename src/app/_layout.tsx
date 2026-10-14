import { DarkTheme, DefaultTheme, router, Stack, ThemeProvider as NavigationThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useSyncExternalStore } from 'react';
import { Alert } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { ReducedMotionConfig, ReduceMotion } from 'react-native-reanimated';

import { useReducedMotion } from '@/animation/reducedMotion';

import { ThemeFade } from '@/components/ThemeFade';
import { databaseHealth } from '@/storage/database/health';
import { usePreferences } from '@/storage/preferences/preferences';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';
import { t } from '@/i18n';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <ThemeProvider>
          <ThemedNavigation />
        </ThemeProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}

function ThemedNavigation() {
  const { scheme, colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const motionPreference = usePreferences().reducedMotion;
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;

  // The launch integrity check found a problem: say so once, and point to the user's backups
  const damaged = useSyncExternalStore(databaseHealth.subscribe, databaseHealth.isDamaged);
  useEffect(() => {
    if (!damaged) return;
    Alert.alert(
      t('data.health.title'),
      t('data.health.message'),
      [
        { text: t('data.health.notNow'), style: 'cancel' },
        { text: t('data.health.openSettings'), onPress: () => router.push('/settings') },
      ],
    );
  }, [damaged]);
  const navigationTheme = {
    ...base,
    colors: {
      ...base.colors,
      primary: colors.textPrimary,
      background: colors.background,
      card: colors.surface,
      text: colors.textPrimary,
      border: colors.borderSubtle,
    },
  };

  return (
    <NavigationThemeProvider value={navigationTheme}>
      <StatusBar animated style={scheme === 'dark' ? 'light' : 'dark'} />
      {/* Pushes slide normally; reduced motion swaps the slide for a fade. Back is a bare chevron: the
          previous screen is often the tabs group, whose route name ("(tabs)") would otherwise show as its title */}
      <Stack screenOptions={{ animation: reducedMotion ? 'fade' : 'default', headerBackButtonDisplayMode: 'minimal' }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="settings/index" options={{ title: t('common.screen.settings') }} />
        <Stack.Screen name="settings/currency" options={{ title: t('common.screen.currency') }} />
        <Stack.Screen name="settings/export" options={{ title: t('common.screen.export') }} />
        <Stack.Screen name="categories/index" options={{ title: t('common.screen.categories') }} />
        <Stack.Screen name="categories/[id]" options={{ title: t('common.screen.category') }} />
        <Stack.Screen name="expense/[id]" options={{ title: t('common.screen.expense') }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
      </Stack>
      <ThemeFade />
      {/* Settings override: Reanimated's own default (springs, layout animations) follows the choice too.
          Our reduced-motion fades use ReduceMotion.Never, so they still play under "On". */}
      {motionPreference !== 'system' && (
        <ReducedMotionConfig mode={motionPreference === 'on' ? ReduceMotion.Always : ReduceMotion.Never} />
      )}
    </NavigationThemeProvider>
  );
}
