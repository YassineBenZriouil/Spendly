import * as Haptics from 'expo-haptics';

// shortcut: always on; Phase 4 wires the Settings "Haptics" toggle in here
const enabled = true;

const ignore = () => {};

/** Small adapter so the app never depends on the haptics library directly. Haptics are always optional. */
export const haptics = {
  /** Amount crossing a meaningful threshold while dragging. */
  tick() {
    if (enabled) Haptics.selectionAsync().catch(ignore);
  },
  /** Category picked. */
  select() {
    if (enabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(ignore);
  },
  /** Expense saved. */
  success() {
    if (enabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(ignore);
  },
};
