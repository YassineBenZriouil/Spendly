import { StyleSheet } from 'react-native';

import { Radius, Spacing, Typography } from '@/theme/tokens';

export const PLOT_HEIGHT = 120;

export const styles = StyleSheet.create({
  chart: {
    gap: Spacing.sm,
  },
  readoutSlot: {
    height: 22,
  },
  readout: {
    ...Typography.label,
    fontVariant: ['tabular-nums'],
    position: 'absolute',
    left: 0,
    right: 0,
  },
  plot: {
    height: PLOT_HEIGHT,
  },
  gridTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
  },
  baseline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
  },
  bars: {
    ...StyleSheet.absoluteFill,
    flexDirection: 'row',
  },
  // The whole column is the tap target, larger than the bar itself
  slot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bar: {
    // Rounded data end, square at the baseline
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  ring: {
    width: 6,
    height: 6,
    borderRadius: Radius.pill,
    borderWidth: 1,
    marginBottom: 2,
  },
  labels: {
    flexDirection: 'row',
  },
  label: {
    ...Typography.caption,
    fontSize: 11,
    flex: 1,
    textAlign: 'center',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  legendLabel: {
    ...Typography.caption,
    fontSize: 11,
  },
  keyBar: {
    width: 8,
    height: 12,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  keyStub: {
    width: 8,
    height: 2,
  },
  keyRing: {
    width: 6,
    height: 6,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
});
