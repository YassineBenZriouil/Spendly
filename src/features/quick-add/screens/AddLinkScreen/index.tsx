import { Redirect, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import type { AddLinkParams } from '@/domain/links/addLink';

/**
 * `spendly://add?…` lands here and goes straight on to Add with the same values, plus a nonce so Add handles each
 * link once (and the same link again next time). See `useAddLink`.
 */
export function AddLinkScreen() {
  const { amount, currency, category, save, quick } = useLocalSearchParams<AddLinkParams>();
  const [nonce] = useState(() => String(Date.now()));
  const params = Object.fromEntries(
    Object.entries({ amount, currency, category, save, quick }).filter(([, value]) => typeof value === 'string'),
  ) as Record<string, string>;
  return <Redirect href={{ pathname: '/', params: { ...params, link: nonce } }} />;
}
