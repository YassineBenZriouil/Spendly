import { router } from 'expo-router';

import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';

export default function ActivityScreen() {
  return (
    <Screen>
      <EmptyState
        icon="activity"
        title="No expenses yet"
        message="Expenses you record will show up here, grouped by day."
        action={{ label: 'Add an expense', onPress: () => router.navigate('/') }}
      />
    </Screen>
  );
}
