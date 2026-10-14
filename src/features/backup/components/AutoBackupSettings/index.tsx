import { useRef } from 'react';
import { AccessibilityInfo, Alert, Switch, Text } from 'react-native';
import Animated from 'react-native-reanimated';

import { fade } from '@/animation/transitions';
import { Button } from '@/components/Button';
import { ErrorBanner } from '@/components/ErrorBanner';
import { ListRow } from '@/components/ListRow';
import { AUTO_BACKUP_KEEP } from '@/domain/backup/autoBackup';
import { t } from '@/i18n';
import { writeFailureMessage } from '@/storage/database/errors';
import { usePreferences } from '@/storage/preferences/preferences';
import { useTheme } from '@/theme/ThemeProvider';
import { formatDayTime } from '@/utils/dateFormat';

import { setAutoBackup, shareLatestAutoBackup } from '../../autoBackup';
import { styles } from './styles';

/** Settings → Data: weekly auto-backup (off by default), its last date or failure, and sharing the latest file. */
export function AutoBackupSettings() {
  const { colors } = useTheme();
  const { autoBackup, autoBackupStatus } = usePreferences();
  const busy = useRef(false);
  const lastAt = autoBackupStatus?.lastAt;
  // A failure is shown only when it is newer than the last good backup
  const failed = autoBackupStatus?.failedAt && (!lastAt || autoBackupStatus.failedAt > lastAt) ? autoBackupStatus.error : undefined;

  const toggle = async (on: boolean) => {
    if (busy.current) return;
    busy.current = true;
    await setAutoBackup(on).catch(() => undefined);
    busy.current = false;
    AccessibilityInfo.announceForAccessibility(t(on ? 'data.autoBackup.on' : 'data.autoBackup.off'));
  };

  const share = () =>
    shareLatestAutoBackup().catch((error) => Alert.alert(t('data.backUp.failedTitle'), writeFailureMessage(error, t('data.backUp.failedMessage'))));

  const status = lastAt ? t('data.autoBackup.last', { date: formatDayTime(new Date(lastAt)) }) : autoBackup ? t('data.autoBackup.none') : null;

  return (
    <>
      <ListRow
        label={t('data.autoBackup.label')}
        caption={t('data.autoBackup.caption', { keep: AUTO_BACKUP_KEEP })}
        accessory={
          <Switch
            accessibilityLabel={t('data.autoBackup.label')}
            value={autoBackup}
            onValueChange={toggle}
            trackColor={{ true: colors.success, false: colors.borderSubtle }}
            thumbColor={colors.surface}
            ios_backgroundColor={colors.borderSubtle}
          />
        }
      />
      {status && (
        // Keyed so a new date cross-fades in
        <Animated.View key={status} {...fade} style={styles.status}>
          <Text style={[styles.note, { color: colors.textSecondary }]}>{status}</Text>
          {lastAt && <Button label={t('data.autoBackup.shareLatest')} variant="secondary" onPress={share} />}
        </Animated.View>
      )}
      {failed && <ErrorBanner message={t('data.autoBackup.failedWith', { reason: failed })} />}
    </>
  );
}
