import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeInRight,
  FadeOut,
  FadeOutRight,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

import { useReducedMotion } from '@/animation/reducedMotion';
import { Duration } from '@/animation/tokens';
import { fade, settleTo, useLayoutTransition } from '@/animation/transitions';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { useTheme } from '@/theme/ThemeProvider';
import { FontScaleCap } from '@/theme/tokens';
import { t } from '@/i18n';

import type { QuickAddPhase } from '../../state/quickAddReducer';
import { styles } from './styles';

type SaveActionProps = {
  phase: QuickAddPhase;
  canSave: boolean;
  onSave: () => void;
  /** Spoken description of the last saved expense while Undo is available. */
  undoLabel: string | null;
  onUndo: () => void;
};

const labels: Partial<Record<QuickAddPhase, string>> = {
  saving: t('quickAdd.save.saving'),
  saved: t('quickAdd.save.saved'),
  error: t('quickAdd.save.tryAgain'),
};

export function SaveAction({ phase, canSave, onSave, undoLabel, onUndo }: SaveActionProps) {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const enabled = useSharedValue(canSave ? 1 : 0);
  const saved = useSharedValue(phase === 'saved' ? 1 : 0);
  const pressed = useSharedValue(0);

  useEffect(() => {
    enabled.set(settleTo(canSave ? 1 : 0, reducedMotion));
  }, [canSave, reducedMotion, enabled]);

  useEffect(() => {
    saved.set(settleTo(phase === 'saved' ? 1 : 0, reducedMotion));
  }, [phase, reducedMotion, saved]);

  const buttonStyle = useAnimatedStyle(() => {
    const idle = interpolateColor(enabled.get(), [0, 1], [colors.surfaceSecondary, colors.accent]);
    const pressedColor = interpolateColor(pressed.get(), [0, 1], [idle, colors.accentPressed]);
    return {
      backgroundColor: interpolateColor(saved.get(), [0, 1], [pressedColor, colors.success]),
      transform: [{ scale: reducedMotion ? 1 : interpolate(pressed.get(), [0, 1], [1, 0.96]) }],
    };
  });

  const textStyle = useAnimatedStyle(() => {
    const idle = interpolateColor(enabled.get(), [0, 1], [colors.textSecondary, colors.onAccent]);
    return { color: interpolateColor(saved.get(), [0, 1], [idle, colors.surface]) };
  });

  const label = labels[phase] ?? t('quickAdd.save.label');
  const labelFade = reducedMotion
    ? fade
    : { entering: FadeIn.duration(Duration.quick), exiting: FadeOut.duration(Duration.micro) };
  const layout = useLayoutTransition();

  return (
    <View style={styles.row}>
      <Animated.View layout={layout} style={styles.saveCell}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={phase === 'error' ? t('quickAdd.save.retryAccessibilityLabel') : t('quickAdd.save.accessibilityLabel')}
          accessibilityState={{ disabled: !canSave, busy: phase === 'saving' }}
          disabled={!canSave}
          onPress={onSave}
          onPressIn={() => pressed.set(settleTo(1, reducedMotion))}
          onPressOut={() => pressed.set(settleTo(0, reducedMotion))}>
          <Animated.View style={[styles.button, buttonStyle]}>
            {/* Keyed so each label change cross-fades instead of snapping */}
            <Animated.View key={label} {...labelFade} style={styles.labelLayer}>
              {phase === 'saved' && <Icon name="check" color={colors.surface} size={20} />}
              <Animated.Text maxFontSizeMultiplier={FontScaleCap.control} style={[styles.label, textStyle]}>{label}</Animated.Text>
            </Animated.View>
          </Animated.View>
        </Pressable>
      </Animated.View>

      {undoLabel && (
        <Animated.View
          layout={layout}
          entering={reducedMotion ? labelFade.entering : FadeInRight.duration(Duration.standard)}
          exiting={reducedMotion ? labelFade.exiting : FadeOutRight.duration(Duration.quick)}>
          <Button label={t('quickAdd.undo.label')}
            variant="secondary"
            onPress={onUndo}
            accessibilityHint={t('quickAdd.undo.hint', { expense: undoLabel })} />
        </Animated.View>
      )}
    </View>
  );
}
