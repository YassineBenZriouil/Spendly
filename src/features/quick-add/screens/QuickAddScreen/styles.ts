import { StyleSheet } from 'react-native';

import { Radius, Spacing, Typography } from '@/theme/tokens';

export const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  date: Typography.label,
  stage: {
    flex: 1,
  },
  anchor: {
    alignSelf: 'center',
    width: 176,
    height: 40,
    marginTop: Spacing.sm,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: Typography.caption,
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  panel: {
    // Fits the 4-row keypad; the category grid sits at the bottom of it
    height: 216,
    marginBottom: Spacing.lg,
  },
  panelLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  error: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
  },
  errorText: Typography.body,
  footer: {
    paddingBottom: Spacing.md,
  },
});
