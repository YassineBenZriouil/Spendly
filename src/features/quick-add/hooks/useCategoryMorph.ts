import { useState } from 'react';
import type { View } from 'react-native';
import { useAnimatedRef, type AnimatedRef } from 'react-native-reanimated';

import type { ExpenseCategory } from '@/domain/category/category.types';
import { createId } from '@/utils/ids';

/**
 * - active: flies from its tile to the anchor above the amount
 * - replaced: another category was picked; fades out where it is
 * - returning: draft was reset; flies back into its tile
 */
export type MorphChipState = 'active' | 'replaced' | 'returning';

export type MorphChipModel = {
  key: string;
  category: ExpenseCategory;
  tileRef: AnimatedRef<View>;
  state: MorphChipState;
};

/**
 * Category -> composer morph, done with an overlay clone (IDENTITY.md §9): the tile stays in the grid,
 * a chip measured from it flies to the anchor. Several chips can coexist while one fades and another flies.
 */
export function useCategoryMorph() {
  const stageRef = useAnimatedRef<View>();
  const anchorRef = useAnimatedRef<View>();
  const [chips, setChips] = useState<MorphChipModel[]>([]);

  const show = (category: ExpenseCategory, tileRef: AnimatedRef<View>) => {
    const key = createId();
    setChips((current) => [
      ...current.map((chip) => (chip.state === 'active' ? { ...chip, state: 'replaced' as const } : chip)),
      { key, category, tileRef, state: 'active' },
    ]);
  };

  const hide = () => {
    setChips((current) =>
      current.map((chip) => (chip.state === 'active' ? { ...chip, state: 'returning' as const } : chip)),
    );
  };

  const remove = (key: string) => {
    setChips((current) => current.filter((chip) => chip.key !== key));
  };

  return { stageRef, anchorRef, chips, show, hide, remove };
}
