import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Alert, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { fade } from '@/animation/transitions';
import { Button } from '@/components/Button';
import { ErrorBanner } from '@/components/ErrorBanner';
import { Icon } from '@/components/Icon';
import { t } from '@/i18n';
import { updatePreferences } from '@/storage/preferences/preferences';
import { useTheme } from '@/theme/ThemeProvider';

import { authenticate } from '../../authenticate';
import { lockStore, type LockStatus } from '../../state/lockStore';
import { styles } from './styles';

/**
 * Covers the whole app while it is locked, or hidden for the app switcher. Appears at once, without a fade: the
 * system snapshots the app for the switcher right after it leaves, and a fade would let the data show through.
 * It fades out when unlocked.
 */
export function LockScreen({ status }: { status: Exclude<LockStatus, 'unlocked'> }) {
  const { colors } = useTheme();
  const [failed, setFailed] = useState(false);
  const busy = useRef(false);

  const unlock = async () => {
    if (busy.current) return;
    busy.current = true;
    const result = await authenticate().catch(() => 'failed' as const);
    busy.current = false;
    setFailed(result === 'failed');
    if (result === 'ok') {
      lockStore.unlock();
      AccessibilityInfo.announceForAccessibility(t('lock.unlocked'));
    } else if (result === 'unavailable') {
      // Passcode and biometrics were removed: nothing to check against, so never keep the owner out of their data
      updatePreferences({ appLock: false });
      lockStore.unlock();
      Alert.alert(t('lock.turnedOffTitle'), t('lock.turnedOffMessage'));
    }
  };

  // Ask right away when the lock appears (launch, or coming back); after a cancel, the button asks again
  useEffect(() => {
    if (status === 'locked') unlock();
  }, [status]);

  return (
    <Animated.View
      exiting={fade.exiting}
      accessibilityViewIsModal
      style={[styles.cover, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Icon name="lock" color={colors.textSecondary} size={40} />
        <Text accessibilityRole="header" style={[styles.title, { color: colors.textPrimary }]}>
          {t('lock.title')}
        </Text>
        {status === 'locked' && (
          <Animated.View {...fade} style={styles.actions}>
            <Button label={t('lock.unlock')} onPress={unlock} />
            {failed && <ErrorBanner message={t('lock.failed')} />}
          </Animated.View>
        )}
      </View>
    </Animated.View>
  );
}
