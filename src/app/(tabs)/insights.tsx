import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';

export default function InsightsScreen() {
  return (
    <Screen>
      <EmptyState
        icon="insights"
        title="Nothing to show yet"
        message="Weekly and monthly summaries appear once you have some expenses."
      />
    </Screen>
  );
}
