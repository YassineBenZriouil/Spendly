import { useRef } from 'react';
import { AccessibilityInfo, Alert, Switch, Text } from 'react-native';
import Animated from 'react-native-reanimated';

import { fade } from '@/animation/transitions';
import { ListRow } from '@/components/ListRow';
import { OptionGroup } from '@/components/OptionGroup';
import { t } from '@/i18n';
import { updatePreferences, usePreferences, type LockGraceSeconds } from '@/storage/preferences/preferences';
import { useTheme } from '@/theme/ThemeProvider';

import { authenticate } from '../../authenticate';
import { lockStore } from '../../state/lockStore';
import { styles } from './styles';

/** Settings → Security. Turning the lock on needs a successful unlock first, so nobody can lock themselves out. */
export function AppLockSettings() {
  const { colors } = useTheme();
  const { appLock, lockGraceSeconds } = usePreferences();
  const busy = useRef(false);

  const toggle = async (on: boolean) => {
    if (!on) {
      updatePreferences({ appLock: false });
      lockStore.unlock();
      AccessibilityInfo.announceForAccessibility(t('lock.settings.off'));
      return;
    }
    if (busy.current) return;
    busy.current = true;
    const result = await authenticate(t('lock.settings.enablePrompt')).catch(() => 'failed' as const);
    busy.current = false;
    if (result === 'ok') {
      updatePreferences({ appLock: true });
      AccessibilityInfo.announceForAccessibility(t('lock.settings.on'));
    } else if (result === 'unavailable') {
      Alert.alert(t('lock.settings.noPasscodeTitle'), t('lock.settings.noPasscodeMessage'));
    }
  };

  return (
    <>
      <ListRow
        label={t('lock.settings.label')}
        caption={t('lock.settings.caption')}
        accessory={
          <Switch
            accessibilityLabel={t('lock.settings.label')}
            value={appLock}
            onValueChange={toggle}
            trackColor={{ true: colors.success, false: colors.borderSubtle }}
            thumbColor={colors.surface}
            ios_backgroundColor={colors.borderSubtle}
          />
        }
      />
      {appLock && (
        <Animated.View {...fade} style={styles.grace}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>{t('lock.settings.grace')}</Text>
          <OptionGroup<LockGraceSeconds>
            accessibilityLabel={t('lock.settings.grace')}
            options={[
              { value: 0, label: t('lock.settings.immediately') },
              { value: 60, label: t('lock.settings.oneMinute') },
            ]}
            value={lockGraceSeconds}
            onChange={(next) => updatePreferences({ lockGraceSeconds: next })}
          />
        </Animated.View>
      )}
    </>
  );
}
