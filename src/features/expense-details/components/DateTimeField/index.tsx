import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Platform, Pressable, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { ReducedTiming } from '@/animation/tokens';
import { Icon } from '@/components/Icon';
import { IconButton } from '@/components/IconButton';
import { useTheme } from '@/theme/ThemeProvider';
import { formatDayTime } from '@/utils/dateFormat';

import { styles } from './styles';

type DateTimeFieldProps = {
  /** ISO timestamp; undefined means "now" (decided when saving). */
  value: string | undefined;
  onChange: (iso: string | undefined) => void;
  /** Offer a "back to now" button while a custom time is set. */
  resettable?: boolean;
};

const fade = {
  entering: FadeIn.duration(ReducedTiming.duration).reduceMotion(ReducedTiming.reduceMotion),
  exiting: FadeOut.duration(ReducedTiming.duration).reduceMotion(ReducedTiming.reduceMotion),
};

/** When the expense happened. Future times can't be picked. */
export function DateTimeField({ value, onChange, resettable = false }: DateTimeFieldProps) {
  const { colors, scheme } = useTheme();
  const date = value ? new Date(value) : new Date();
  const label = value ? formatDayTime(date) : 'Now';

  // Android has no combined date+time picker: open the system date dialog, then the time dialog
  const openAndroid = () => {
    DateTimePickerAndroid.open({
      value: date,
      mode: 'date',
      maximumDate: new Date(),
      onValueChange: (_event, pickedDay) => {
        DateTimePickerAndroid.open({
          value: pickedDay,
          mode: 'time',
          onValueChange: (_e, picked) => onChange(clampToNow(picked).toISOString()),
        });
      },
    });
  };

  return (
    <View style={[styles.field, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
      <Icon name="calendar" color={colors.textSecondary} size={18} />
      {Platform.OS === 'ios' ? (
        <View style={styles.value}>
          <DateTimePicker
            value={date}
            mode="datetime"
            display="compact"
            maximumDate={new Date()}
            themeVariant={scheme}
            accentColor={colors.textPrimary}
            accessibilityLabel="Date and time"
            onValueChange={(_event, picked) => onChange(clampToNow(picked).toISOString())}
          />
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Date and time: ${label}`}
          accessibilityHint="Opens date and time pickers"
          onPress={openAndroid}
          style={styles.value}>
          {/* Keyed so a new date cross-fades in */}
          <Animated.View key={label} {...fade} style={styles.labelLayer}>
            <Text numberOfLines={1} style={[styles.label, { color: colors.textPrimary }]}>
              {label}
            </Text>
          </Animated.View>
        </Pressable>
      )}
      <View style={styles.trailing}>
        {resettable && value && (
          <Animated.View {...fade}>
            <IconButton icon="reset" variant="plain" accessibilityLabel="Set to now" onPress={() => onChange(undefined)} />
          </Animated.View>
        )}
      </View>
    </View>
  );
}

/** The time dialog has no maximum: a later hour today would land in the future. */
function clampToNow(date: Date) {
  const now = new Date();
  return date > now ? now : date;
}
