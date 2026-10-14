// App entry: Expo Router, plus the background work that runs without the app's UI: the Android home-screen widget's
// task and the weekly auto-backup (both must be defined here, before anything is shown)
import 'expo-router/entry';
import { Platform } from 'react-native';
import { registerWidgetTaskHandler } from 'react-native-android-widget';

import { defineAutoBackupTask } from './src/features/backup/autoBackup';
import { widgetTaskHandler } from './src/features/widget/widgetTasks';

defineAutoBackupTask();
if (Platform.OS === 'android') registerWidgetTaskHandler(widgetTaskHandler);
