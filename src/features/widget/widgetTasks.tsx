import { Platform } from 'react-native';
import { requestWidgetUpdate, type WidgetTaskHandler } from 'react-native-android-widget';

import { expenseRepository } from '@/domain/expense/expense.repository';
import { getPreferences } from '@/storage/preferences/preferences';
import { themeColors } from '@/theme/tokens';
import { localDayRange } from '@/utils/dates';

import { TODAY_WIDGET, TodayWidget } from './TodayWidget';

/** The widget for right now, in both light and dark (the launcher picks), with the app's style and accent. */
async function renderToday() {
  const totals = await expenseRepository.totalsBetween(localDayRange(new Date()));
  const { themeStyle, accent } = getPreferences();
  return {
    light: <TodayWidget totals={totals} colors={themeColors(themeStyle, 'light', accent)} />,
    dark: <TodayWidget totals={totals} colors={themeColors(themeStyle, 'dark', accent)} />,
  };
}

/**
 * Runs in the background when Android asks: the widget was added, resized, or its 30-minute refresh came (which
 * also rolls it over to a new day). Taps are handled natively (they open spendly://add).
 */
export const widgetTaskHandler: WidgetTaskHandler = async ({ widgetAction, renderWidget }) => {
  if (widgetAction === 'WIDGET_ADDED' || widgetAction === 'WIDGET_UPDATE' || widgetAction === 'WIDGET_RESIZED') {
    renderWidget(await renderToday());
  }
};

/** Redraws the widget now (after a write, or when the app comes back). Android only; nothing if none is placed. */
export function updateTodayWidget() {
  if (Platform.OS !== 'android') return;
  requestWidgetUpdate({ widgetName: TODAY_WIDGET, renderWidget: renderToday }).catch(() => {
    // The next write or the 30-minute refresh tries again
  });
}
