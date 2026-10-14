// App entry: Expo Router, plus the Android home-screen widget's background task (it runs without the app's UI)
import 'expo-router/entry';
import { Platform } from 'react-native';
import { registerWidgetTaskHandler } from 'react-native-android-widget';

import { widgetTaskHandler } from './src/features/widget/widgetTasks';

if (Platform.OS === 'android') registerWidgetTaskHandler(widgetTaskHandler);
