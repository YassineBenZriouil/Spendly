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
      'Your data needs attention',
      'Spendly found a problem in its data file and left it exactly as it is. If anything looks wrong, restore your latest backup (Settings → Data).',
      [
        { text: 'Not now', style: 'cancel' },
        { text: 'Open Settings', onPress: () => router.push('/settings') },
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
        <Stack.Screen name="settings/index" options={{ title: 'Settings' }} />
        <Stack.Screen name="settings/currency" options={{ title: 'Currency' }} />
        <Stack.Screen name="settings/export" options={{ title: 'Export' }} />
        <Stack.Screen name="categories/index" options={{ title: 'Categories' }} />
        <Stack.Screen name="categories/[id]" options={{ title: 'Category' }} />
        <Stack.Screen name="expense/[id]" options={{ title: 'Expense' }} />
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
