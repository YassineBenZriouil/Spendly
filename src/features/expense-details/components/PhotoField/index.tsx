import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Alert, Linking, Pressable, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { useReducedMotion } from '@/animation/reducedMotion';
import { fade, settleTo } from '@/animation/transitions';
import { Button } from '@/components/Button';
import { ErrorBanner } from '@/components/ErrorBanner';
import { t } from '@/i18n';
import { photoUri, storePhoto } from '@/storage/photos/photoFiles';
import { useTheme } from '@/theme/ThemeProvider';

import { styles } from './styles';

/** How long "Photo removed · Undo" stays, like the app's other Undo offers. */
const UNDO_MS = 5000;

type PhotoFieldProps = {
  /** File name of the receipt photo, if any. */
  photo: string | undefined;
  onChange: (photo: string | undefined) => void;
};

/**
 * Receipt photo: add from the camera or the library, shown as a thumbnail (tap for full screen), replace, or remove
 * with Undo. The photo file is written as soon as it is picked; the expense refers to it only once saved, and files
 * nothing refers to are cleaned up later (`cleanUpPhotos`).
 */
export function PhotoField({ photo, onChange }: PhotoFieldProps) {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  /** The photo just removed, while Undo is offered. */
  const [removed, setRemoved] = useState<string | null>(null);
  const pressed = useSharedValue(0);
  const thumbStyle = useAnimatedStyle(() => ({ opacity: 1 - pressed.get() * 0.4 }));

  useEffect(() => {
    if (!removed) return;
    const timer = setTimeout(() => setRemoved(null), UNDO_MS);
    return () => clearTimeout(timer);
  }, [removed]);

  const pick = async (source: 'camera' | 'library') => {
    if (source === 'camera') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(t('expense.photo.cameraDeniedTitle'), t('expense.photo.cameraDeniedMessage'), [
          { text: t('expense.photo.cancel'), style: 'cancel' },
          { text: t('expense.photo.openSettings'), onPress: () => Linking.openSettings() },
        ]);
        return;
      }
    }
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1 };
    const result =
      source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    if (result.canceled) return;
    setBusy(true);
    setFailed(false);
    try {
      const name = await storePhoto(result.assets[0]);
      setRemoved(null);
      onChange(name);
      AccessibilityInfo.announceForAccessibility(t('expense.photo.added'));
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  const choose = () =>
    Alert.alert(t('expense.photo.chooseTitle'), undefined, [
      { text: t('expense.photo.camera'), onPress: () => pick('camera') },
      { text: t('expense.photo.library'), onPress: () => pick('library') },
      { text: t('expense.photo.cancel'), style: 'cancel' },
    ]);

  const remove = () => {
    if (!photo) return;
    setRemoved(photo);
    onChange(undefined);
    AccessibilityInfo.announceForAccessibility(t('expense.photo.removed'));
  };

  const undo = () => {
    if (!removed) return;
    onChange(removed);
    setRemoved(null);
    AccessibilityInfo.announceForAccessibility(t('expense.photo.restored'));
  };

  // One state at a time, cross-fading into the next in the same place
  const state = busy ? 'busy' : photo ? `photo-${photo}` : removed ? 'removed' : 'empty';

  return (
    <View style={styles.field}>
      <Animated.View key={state} {...fade} style={styles.row}>
        {busy ? (
          <>
            <ActivityIndicator color={colors.textSecondary} />
            <Text style={[styles.caption, { color: colors.textSecondary }]}>{t('expense.photo.processing')}</Text>
          </>
        ) : photo ? (
          <>
            <Pressable
              accessibilityRole="imagebutton"
              accessibilityLabel={t('expense.photo.label')}
              accessibilityHint={t('expense.photo.openHint')}
              onPress={() => router.push({ pathname: '/photo/[name]', params: { name: photo } })}
              onPressIn={() => pressed.set(settleTo(1, reducedMotion))}
              onPressOut={() => pressed.set(settleTo(0, reducedMotion))}>
              <Animated.Image
                source={{ uri: photoUri(photo) }}
                style={[styles.thumbnail, { backgroundColor: colors.surfaceSecondary }, thumbStyle]}
              />
            </Pressable>
            <Button label={t('expense.photo.replace')} variant="secondary" onPress={choose} />
            <Button label={t('expense.photo.remove')} variant="secondary" onPress={remove} />
          </>
        ) : removed ? (
          <>
            <Text style={[styles.caption, { color: colors.textSecondary }]}>{t('expense.photo.removed')}</Text>
            <Button label={t('expense.photo.undo')} variant="secondary" onPress={undo} accessibilityHint={t('expense.photo.undoHint')} />
          </>
        ) : (
          <Button label={t('expense.photo.add')} variant="secondary" onPress={choose} />
        )}
      </Animated.View>
      {failed && <ErrorBanner message={t('expense.photo.failed')} />}
    </View>
  );
}
