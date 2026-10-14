import { router } from 'expo-router';
import { FlatList, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { fade } from '@/animation/transitions';
import { Icon } from '@/components/Icon';
import { ListRow } from '@/components/ListRow';
import { Screen } from '@/components/Screen';
import { currencyOptions } from '@/domain/money/currencies';
import { deviceCurrency, formatMoney } from '@/domain/money/money.format';
import { updatePreferences, usePreferences } from '@/storage/preferences/preferences';
import { useTheme } from '@/theme/ThemeProvider';
import { EdgeToEdge } from '@/theme/tokens';
import { t } from '@/i18n';

import { styles } from './styles';

export function CurrencyScreen() {
  const { colors } = useTheme();
  const { currencyCode } = usePreferences();
  const options = currencyOptions(currencyCode, deviceCurrency());

  return (
    <Screen edges={['bottom']}>
      <FlatList
        data={options}
        keyExtractor={(item) => item.code}
        style={EdgeToEdge.scroll}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListHeaderComponent={
          <Text style={[styles.note, { color: colors.textSecondary }]}>
            {t('settings.currency.note')}
          </Text>
        }
        renderItem={({ item }) => {
          const selected = item.code === currencyCode;
          return (
            <ListRow
              label={item.name}
              caption={`${item.code} · ${formatMoney(1234, item.code)}`}
              accessibilityHint={selected ? t('settings.currency.selected') : undefined}
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
        contentContainerStyle={[styles.content, EdgeToEdge.content]}
      />
    </Screen>
  );
}
