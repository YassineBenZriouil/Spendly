import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { fade } from '@/animation/transitions';
import { EmptyState } from '@/components/EmptyState';
import { IconButton } from '@/components/IconButton';
import { Screen } from '@/components/Screen';
import { isPhotoName } from '@/domain/photo/photo';
import { t } from '@/i18n';
import { photoUri } from '@/storage/photos/photoFiles';

import { styles } from './styles';

/** A receipt photo, full screen. Opened from the photo's thumbnail in the details fields. */
export function PhotoScreen() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const [missing, setMissing] = useState(!isPhotoName(name));

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.header}>
        <IconButton icon="close" accessibilityLabel={t('expense.photo.close')} onPress={() => router.back()} />
      </View>
      {missing ? (
        <Animated.View {...fade} style={styles.photo}>
          <EmptyState icon="error" title={t('expense.photo.missingTitle')} message={t('expense.photo.missing')} />
        </Animated.View>
      ) : (
        <Animated.Image
          {...fade}
          accessible
          accessibilityRole="image"
          accessibilityLabel={t('expense.photo.label')}
          source={{ uri: photoUri(name) }}
          resizeMode="contain"
          onError={() => setMissing(true)}
          style={styles.photo}
        />
      )}
    </Screen>
  );
}
