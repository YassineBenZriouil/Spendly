import { StyleSheet } from 'react-native';

import { NumberFont } from '@/theme/tokens';

export const styles = StyleSheet.create({
  container: {
    overflow: 'visible',
    // Digits always run left to right (also in right-to-left languages); the layout below assumes it
    direction: 'ltr',
  },
  fill: {
    ...StyleSheet.absoluteFill,
  },
  /** Live and fitted numbers take the full width in the layout (and their own height), centered in it. */
  stretch: {
    alignSelf: 'stretch',
  },
  /** Zero-width point at the content's right edge; everything is placed leftwards from it. */
  anchor: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 0,
  },
  slot: {
    position: 'absolute',
    top: 0,
    left: 0,
    overflow: 'hidden',
  },
  layer: {
    ...StyleSheet.absoluteFill,
  },
  digits: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    fontFamily: NumberFont.family,
    includeFontPadding: false,
    textAlign: 'center',
  },
  separator: {
    fontFamily: NumberFont.family,
    includeFontPadding: false,
    textAlign: 'center',
  },
  /** `still` mode: one plain text, digits of equal width so amounts in a column line up. */
  still: {
    direction: 'ltr',
    fontFamily: NumberFont.family,
    fontVariant: ['tabular-nums'],
    includeFontPadding: false,
  },
  symbol: {
    position: 'absolute',
    left: 0,
    fontFamily: NumberFont.family,
    includeFontPadding: false,
  },
});
