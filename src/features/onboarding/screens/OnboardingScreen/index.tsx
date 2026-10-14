import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { ReducedTiming } from '@/animation/tokens';
import { fade, useEnterTransition } from '@/animation/transitions';
import { Button } from '@/components/Button';
import { IconButton } from '@/components/IconButton';
import { Screen } from '@/components/Screen';
import { BuiltInCategories } from '@/domain/category/builtInCategories';
import { withDisplayNames } from '@/domain/category/categoryName';
import { formatMoney } from '@/domain/money/money.format';
import { AmountSurface } from '@/features/quick-add/components/AmountSurface';
import { CategoryGrid } from '@/features/quick-add/components/CategoryGrid';
import { useAmountDrag } from '@/features/quick-add/hooks/useAmountDrag';
import { clampAmount, dragConfigFor } from '@/features/quick-add/utils/dragMapping';
import { useLockStatus } from '@/features/lock/state/lockStore';
import { haptics } from '@/haptics/haptics.service';
import { updatePreferences, usePreferences } from '@/storage/preferences/preferences';
import { useTheme } from '@/theme/ThemeProvider';
import { t } from '@/i18n';

import { styles } from './styles';

/** A full row of the real tiles, so the practice looks exactly like Quick Add. */
const PRACTICE_CATEGORIES = withDisplayNames(BuiltInCategories.slice(0, 5));

const STEPS = [
  { title: t('onboarding.step.category.title'), hint: t('onboarding.step.category.hint') },
  { title: t('onboarding.step.amount.title'), hint: t('onboarding.step.amount.hint') },
  { title: t('onboarding.step.save.title'), hint: t('onboarding.step.save.hint') },
];

/** First-launch practice on a miniature composer: tap → drag → Save. Nothing is stored. Skippable at any time. */
export function OnboardingScreen() {
  const { colors } = useTheme();
  const entering = useEnterTransition();
  const { currencyCode, dragSensitivity, amountIncrement } = usePreferences();
  const config = dragConfigFor(currencyCode, { sensitivity: dragSensitivity, increment: amountIncrement });

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

  // A native full-screen modal sits above the lock screen: close it when the app locks (it saves nothing)
  const lockStatus = useLockStatus();
  useEffect(() => {
    if (lockStatus === 'locked') router.back();
  }, [lockStatus]);

  // Shown once: opening it counts, even if the user leaves straight away
  useEffect(() => {
    updatePreferences({ onboardingSeen: true });
  }, []);

  const step = !categoryId ? 0 : amountMinor === 0 ? 1 : 2;

  // The instruction on screen fades out, swaps, then fades back in, in place: in flow (large text can grow) with
  // no overlap of old and new, and nothing disappears instantly
  const instructionKey = saved ? 'done' : String(step);
  const [shownKey, setShownKey] = useState(instructionKey);
  const instructionOpacity = useSharedValue(1);
  useEffect(() => {
    if (instructionKey === shownKey) return;
    instructionOpacity.set(
      withTiming(0, ReducedTiming, (finished) => {
        'worklet';
        if (finished) scheduleOnRN(setShownKey, instructionKey);
      }),
    );
  }, [instructionKey, shownKey, instructionOpacity]);
  useEffect(() => {
    instructionOpacity.set(withTiming(1, ReducedTiming));
  }, [shownKey, instructionOpacity]);
  const instructionStyle = useAnimatedStyle(() => ({ opacity: instructionOpacity.get() }));
  const shownSaved = shownKey === 'done';
  const shownStep = shownSaved ? 0 : Number(shownKey);
  const setAmount = (next: number) => setAmountMinor(clampAmount(next, config));
  const finish = () => router.back();

  const save = () => {
    setSaved(true);
    haptics.success();
    AccessibilityInfo.announceForAccessibility(t('onboarding.done.announcement'));
  };

  return (
    // Full-screen modal: no header, so it keeps clear of both the status bar and the home indicator
    <Screen edges={['top', 'bottom']}>
      <View style={styles.top}>
        <Text accessibilityRole="header" style={[styles.title, { color: colors.textPrimary }]}>
          {t('onboarding.title')}
        </Text>
        {!saved && (
          <Animated.View exiting={fade.exiting}>
            <Button label={t('onboarding.skip.label')}
              variant="secondary"
              onPress={finish}
              accessibilityHint={t('onboarding.skip.hint')} />
          </Animated.View>
        )}
      </View>

      <Animated.View entering={entering} style={styles.body}>
        {/* Announced for screen readers */}
        <View accessibilityLiveRegion="polite">
          <Animated.View style={[styles.instruction, instructionStyle]}>
            <Text style={[styles.stepCount, { color: colors.textSecondary }]}>
              {shownSaved
                ? t('onboarding.done.count')
                : t('onboarding.step.count', { step: shownStep + 1, total: STEPS.length })}
            </Text>
            <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>
              {shownSaved ? t('onboarding.done.title') : STEPS[shownStep].title}
            </Text>
            <Text style={[styles.stepHint, { color: colors.textSecondary }]}>
              {shownSaved ? t('onboarding.done.hint') : STEPS[shownStep].hint}
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
              maxAmountMinor={config.maxAmountMinor}
              onIncrement={() => setAmount(amountMinor + config.stepMinor)}
              onDecrement={() => setAmount(amountMinor - config.stepMinor)}
            />
          </View>
          <View style={styles.controls}>
            <IconButton
              icon="minus"
              accessibilityLabel={t('onboarding.decrease')}
              disabled={saved || amountMinor === 0}
              onPress={() => setAmount(amountMinor - config.stepMinor)}
            />
            <IconButton
              icon="plus"
              accessibilityLabel={t('onboarding.increase')}
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
            <Button label={t('onboarding.start')} onPress={finish} />
          </Animated.View>
        ) : (
          <Animated.View key="save" {...fade}>
            <Button
              label={t('onboarding.save.label')}
              disabled={!categoryId || amountMinor === 0}
              accessibilityHint={
                categoryId && amountMinor > 0 ? t('onboarding.save.hint', { amount: formatMoney(amountMinor, currencyCode) }) : undefined
              }
              onPress={save}
            />
          </Animated.View>
        )}
      </View>
    </Screen>
  );
}
