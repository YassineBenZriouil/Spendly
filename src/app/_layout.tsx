import { DarkTheme, DefaultTheme, Stack, ThemeProvider as NavigationThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';

import { useReducedMotion } from '@/animation/reducedMotion';

import { ThemeFade } from '@/components/ThemeFade';
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
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
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
      {/* Pushes slide normally; reduced motion swaps the slide for a fade */}
      <Stack screenOptions={{ animation: reducedMotion ? 'fade' : 'default' }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
        <Stack.Screen name="expense/[id]" options={{ title: 'Expense' }} />
      </Stack>
      <ThemeFade />
    </NavigationThemeProvider>
  );
}
