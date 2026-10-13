import { View } from 'react-native';
import type { AnimatedRef } from 'react-native-reanimated';

import type { ExpenseCategory } from '@/domain/category/category.types';

import { CategoryTile } from '../CategoryTile';
import { styles } from './styles';

const COLUMNS = 5;

type CategoryGridProps = {
  categories: ExpenseCategory[];
  selectedId: string | null;
  onSelect: (category: ExpenseCategory, tileRef: AnimatedRef<View>) => void;
};

export function CategoryGrid({ categories, selectedId, onSelect }: CategoryGridProps) {
  const selectedIndex = categories.findIndex((category) => category.id === selectedId);
  const rows: ExpenseCategory[][] = [];
  for (let i = 0; i < categories.length; i += COLUMNS) rows.push(categories.slice(i, i + COLUMNS));

  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="Category" style={styles.grid}>
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((category, column) => {
            const index = rowIndex * COLUMNS + column;
            return (
              <CategoryTile
                key={category.id}
                category={category}
                index={index}
                selected={category.id === selectedId}
                dimmed={selectedIndex !== -1 && category.id !== selectedId}
                staggerIndex={selectedIndex === -1 ? 0 : Math.abs(index - selectedIndex)}
                onSelect={onSelect}
              />
            );
          })}
          {/* Keep tile widths equal in a short last row */}
          {Array.from({ length: COLUMNS - row.length }, (_, i) => (
            <View key={`spacer-${i}`} style={styles.spacer} />
          ))}
        </View>
      ))}
    </View>
  );
}
