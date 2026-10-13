import { router } from 'expo-router';
import { FlatList, Text } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { ReducedTiming } from '@/animation/tokens';
import { Icon } from '@/components/Icon';
import { ListRow } from '@/components/ListRow';
import { Screen } from '@/components/Screen';
import { currencyOptions } from '@/domain/money/currencies';
import { deviceCurrency, formatMoney } from '@/domain/money/money.format';
import { updatePreferences, usePreferences } from '@/storage/preferences/preferences';
import { useTheme } from '@/theme/ThemeProvider';

import { styles } from './styles';

const fade = {
  entering: FadeIn.duration(ReducedTiming.duration).reduceMotion(ReducedTiming.reduceMotion),
  exiting: FadeOut.duration(ReducedTiming.duration).reduceMotion(ReducedTiming.reduceMotion),
};

export function CurrencyScreen() {
  const { colors } = useTheme();
  const { currencyCode } = usePreferences();
  const options = currencyOptions(currencyCode, deviceCurrency());

  return (
    <Screen edges={['bottom']}>
      <FlatList
        data={options}
        keyExtractor={(item) => item.code}
        ListHeaderComponent={
          <Text style={[styles.note, { color: colors.textSecondary }]}>
            New expenses use this currency. Expenses you already recorded keep theirs.
          </Text>
        }
        renderItem={({ item }) => {
          const selected = item.code === currencyCode;
          return (
            <ListRow
              label={item.name}
              caption={`${item.code} · ${formatMoney(1234, item.code)}`}
              accessibilityHint={selected ? 'Selected' : undefined}
              accessory={
                selected && (
                  <Animated.View {...fade}>
                    <Icon name="check" color={colors.textPrimary} size={18} />
                  </Animated.View>
                )
              }
              onPress={() => {
                updatePreferences({ currencyCode: item.code });
                router.back();
              }}
            />
          );
        }}
        contentContainerStyle={styles.content}
      />
    </Screen>
  );
}
