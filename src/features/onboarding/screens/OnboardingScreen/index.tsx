import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Text, View } from 'react-native';
import Animated, { useSharedValue } from 'react-native-reanimated';

import { fade, useEnterTransition } from '@/animation/transitions';
import { Button } from '@/components/Button';
import { IconButton } from '@/components/IconButton';
import { Screen } from '@/components/Screen';
import { BuiltInCategories } from '@/domain/category/builtInCategories';
import { formatMoney } from '@/domain/money/money.format';
import { getMoneyPattern } from '@/domain/money/money.pattern';
import { AmountSurface } from '@/features/quick-add/components/AmountSurface';
import { CategoryGrid } from '@/features/quick-add/components/CategoryGrid';
import { useAmountDrag } from '@/features/quick-add/hooks/useAmountDrag';
import { clampAmount, dragConfigFor } from '@/features/quick-add/utils/dragMapping';
import { haptics } from '@/haptics/haptics.service';
import { updatePreferences, usePreferences } from '@/storage/preferences/preferences';
import { useTheme } from '@/theme/ThemeProvider';

import { styles } from './styles';

/** A full row of the real tiles, so the practice looks exactly like Quick Add. */
const PRACTICE_CATEGORIES = BuiltInCategories.slice(0, 5);

const STEPS = [
  { title: 'Tap a category', hint: 'Pick what you spent on.' },
  { title: 'Set the amount', hint: 'Drag the number up or down, or use − and +.' },
  { title: 'Tap Save', hint: 'That records it. Details like a note are optional.' },
] as const;

/** First-launch practice on a miniature composer: tap → drag → Save. Nothing is stored. Skippable at any time. */
export function OnboardingScreen() {
  const { colors } = useTheme();
  const entering = useEnterTransition();
  const { currencyCode, dragSensitivity, amountIncrement } = usePreferences();
  const config = dragConfigFor(currencyCode, { sensitivity: dragSensitivity, increment: amountIncrement });
  const pattern = getMoneyPattern(currencyCode);

  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [amountMinor, setAmountMinor] = useState(0);
  const [saved, setSaved] = useState(false);
  const amount = useSharedValue(0);
  const { gesture, pulse, edgeOffset } = useAmountDrag({
    amount,
    config,
    enabled: !saved,
    onDragStart: () => {},
    onDragEnd: setAmountMinor,
  });

  // Shown once: opening it counts, even if the user leaves straight away
  useEffect(() => {
    updatePreferences({ onboardingSeen: true });
  }, []);

  const step = !categoryId ? 0 : amountMinor === 0 ? 1 : 2;
  const setAmount = (next: number) => setAmountMinor(clampAmount(next, config));
  const finish = () => router.back();

  const save = () => {
    setSaved(true);
    haptics.success();
    AccessibilityInfo.announceForAccessibility('Saved. You are ready to go.');
  };

  return (
    // Full-screen modal: no header, so it keeps clear of both the status bar and the home indicator
    <Screen edges={['top', 'bottom']}>
      <View style={styles.top}>
        <Text accessibilityRole="header" style={[styles.title, { color: colors.textPrimary }]}>
          Welcome to Spendly
        </Text>
        {!saved && (
          <Animated.View exiting={fade.exiting}>
            <Button label="Skip" variant="secondary" onPress={finish} accessibilityHint="Closes the introduction" />
          </Animated.View>
        )}
      </View>

      <Animated.View entering={entering} style={styles.body}>
        {/* Keyed so each instruction fades in (in flow, so large text can grow); announced for screen readers */}
        <View accessibilityLiveRegion="polite">
          <Animated.View key={saved ? 'done' : step} entering={fade.entering} style={styles.instruction}>
            <Text style={[styles.stepCount, { color: colors.textSecondary }]}>
              {saved ? 'Done' : `Step ${step + 1} of ${STEPS.length}`}
            </Text>
            <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>
              {saved ? "That's all it takes" : STEPS[step].title}
            </Text>
            <Text style={[styles.stepHint, { color: colors.textSecondary }]}>
              {saved
                ? 'This was practice, so nothing was saved. Your real expenses stay on this device.'
                : STEPS[step].hint}
            </Text>
          </Animated.View>
        </View>

        <View style={[styles.composer, { backgroundColor: colors.surface }]}>
          <View style={styles.amount}>
            <AmountSurface
              amount={amount}
              pulse={pulse}
              edgeOffset={edgeOffset}
              gesture={gesture}
              amountMinor={amountMinor}
              currencyCode={currencyCode}
              pattern={pattern}
              onIncrement={() => setAmount(amountMinor + config.stepMinor)}
              onDecrement={() => setAmount(amountMinor - config.stepMinor)}
            />
          </View>
          <View style={styles.controls}>
            <IconButton
              icon="minus"
              accessibilityLabel="Decrease amount"
              disabled={saved || amountMinor === 0}
              onPress={() => setAmount(amountMinor - config.stepMinor)}
            />
            <IconButton
              icon="plus"
              accessibilityLabel="Increase amount"
              disabled={saved}
              onPress={() => setAmount(amountMinor + config.stepMinor)}
            />
          </View>
          <CategoryGrid
            categories={PRACTICE_CATEGORIES}
            selectedId={categoryId}
            onSelect={(category) => {
              if (saved) return;
              haptics.select();
              setCategoryId(category.id);
            }}
          />
        </View>
      </Animated.View>

      <View style={styles.footer}>
        {saved ? (
          <Animated.View key="start" {...fade}>
            <Button label="Start using Spendly" onPress={finish} />
          </Animated.View>
        ) : (
          <Animated.View key="save" {...fade}>
            <Button
              label="Save"
              disabled={!categoryId || amountMinor === 0}
              accessibilityHint={
                categoryId && amountMinor > 0 ? `Practice save of ${formatMoney(amountMinor, currencyCode)}` : undefined
              }
              onPress={save}
            />
          </Animated.View>
        )}
      </View>
    </Screen>
  );
}
