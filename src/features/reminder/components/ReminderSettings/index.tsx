import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications';
import { useRef } from 'react';
import { AccessibilityInfo, Alert, Linking, Platform, Pressable, Switch, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { fade } from '@/animation/transitions';
import { Icon } from '@/components/Icon';
import { ListRow } from '@/components/ListRow';
import type { ReminderTime } from '@/domain/reminder/reminder';
import { lockStore } from '@/features/lock/state/lockStore';
import { t } from '@/i18n';
import { updatePreferences, usePreferences } from '@/storage/preferences/preferences';
import { useTheme } from '@/theme/ThemeProvider';
import { formatTime } from '@/utils/dateFormat';

import { syncReminder } from '../../reminderScheduler';
import { styles } from './styles';

/** Evening: late enough to have spent something, early enough to still remember it. */
const DEFAULT_TIME: ReminderTime = { hour: 20, minute: 0 };

const asDate = ({ hour, minute }: ReminderTime) => {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date;
};
const fromDate = (date: Date): ReminderTime => ({ hour: date.getHours(), minute: date.getMinutes() });

const deniedAlert = () =>
  Alert.alert(t('reminder.settings.deniedTitle'), t('reminder.settings.deniedMessage'), [
    { text: t('reminder.settings.cancel'), style: 'cancel' },
    { text: t('reminder.settings.openSettings'), onPress: () => Linking.openSettings() },
  ]);

/** Notification permission is asked only here, when the reminder is turned on, after our own explanation. */
async function ensurePermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) {
    deniedAlert();
    return false;
  }
  const proceed = await new Promise<boolean>((resolve) =>
    Alert.alert(t('reminder.settings.explainTitle'), t('reminder.settings.explainMessage'), [
      { text: t('reminder.settings.cancel'), style: 'cancel', onPress: () => resolve(false) },
      { text: t('reminder.settings.continue'), onPress: () => resolve(true) },
    ]),
  );
  if (!proceed) return false;
  const asked = await lockStore.withoutLock(() => Notifications.requestPermissionsAsync());
  if (!asked.granted) deniedAlert();
  return asked.granted;
}

/** Settings → Reminder: off by default; one notification a day, skipped on days something was logged. */
export function ReminderSettings() {
  const { colors, scheme } = useTheme();
  const { reminder } = usePreferences();
  const busy = useRef(false);

  const apply = (next: ReminderTime | undefined) => {
    updatePreferences({ reminder: next });
    syncReminder();
    AccessibilityInfo.announceForAccessibility(
      next ? t('reminder.settings.on', { time: formatTime(asDate(next)) }) : t('reminder.settings.off'),
    );
  };

  const toggle = async (on: boolean) => {
    if (!on) return apply(undefined);
    if (busy.current) return;
    busy.current = true;
    const granted = await ensurePermission().catch(() => false);
    busy.current = false;
    if (granted) apply(DEFAULT_TIME);
  };

  const timeLabel = reminder ? formatTime(asDate(reminder)) : '';

  return (
    <>
      <ListRow
        label={t('reminder.settings.label')}
        caption={t('reminder.settings.caption')}
        accessory={
          <Switch
            accessibilityLabel={t('reminder.settings.label')}
            value={reminder !== undefined}
            onValueChange={toggle}
            trackColor={{ true: colors.success, false: colors.borderSubtle }}
            thumbColor={colors.surface}
            ios_backgroundColor={colors.borderSubtle}
          />
        }
      />
      {reminder && (
        <Animated.View {...fade} style={[styles.field, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
          <Icon name="calendar" color={colors.textSecondary} size={18} />
          <Text style={[styles.label, { color: colors.textPrimary }]}>{t('reminder.settings.time')}</Text>
          {Platform.OS === 'ios' ? (
            <View style={styles.value}>
              <DateTimePicker
                value={asDate(reminder)}
                mode="time"
                display="compact"
                themeVariant={scheme}
                accentColor={colors.textPrimary}
                accessibilityLabel={t('reminder.settings.time')}
                onValueChange={(_event, picked) => apply(fromDate(picked))}
              />
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('reminder.settings.timeValue', { time: timeLabel })}
              accessibilityHint={t('reminder.settings.timeHint')}
              onPress={() =>
                DateTimePickerAndroid.open({
                  value: asDate(reminder),
                  mode: 'time',
                  onValueChange: (_event, picked) => apply(fromDate(picked)),
                })
              }
              style={styles.value}>
              {/* Keyed so a new time cross-fades in */}
              <Animated.Text key={timeLabel} {...fade} style={[styles.label, { color: colors.textPrimary }]}>
                {timeLabel}
              </Animated.Text>
            </Pressable>
          )}
        </Animated.View>
      )}
    </>
  );
}
