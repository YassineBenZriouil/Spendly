import { loadDraft, loadPendingExpenseId, saveDraft } from '../draftStorage';

const mockStore = new Map<string, string>();
jest.mock('expo-sqlite/kv-store', () => ({
  __esModule: true,
  default: {
    getItemSync: (key: string) => mockStore.get(key) ?? null,
    setItemSync: (key: string, value: string) => mockStore.set(key, value),
    removeItemSync: (key: string) => mockStore.delete(key),
  },
}));

beforeEach(() => mockStore.clear());

describe('draft storage', () => {
  it('round-trips a draft with details and removes empty drafts', () => {
    const draft = { categoryId: 'food', amountMinor: 1250, details: { title: 'Lunch', paymentMethod: 'card' as const } };
    saveDraft(draft);
    expect(loadDraft()).toEqual(draft);
    saveDraft({ categoryId: null, amountMinor: 0 });
    expect(loadDraft()).toBeNull();
  });

  it('keeps the pending-save marker out of the draft and clears it on the next plain write', () => {
    const draft = { categoryId: 'food', amountMinor: 1250 };
    saveDraft(draft, 'expense-1');
    expect(loadPendingExpenseId()).toBe('expense-1');
    expect(loadDraft()).toEqual(draft);

    saveDraft({ ...draft, amountMinor: 1300 });
    expect(loadPendingExpenseId()).toBeUndefined();
  });

  it('ignores corrupt or invalid stored data', () => {
    mockStore.set('quickAdd.draft', '{not json');
    expect(loadDraft()).toBeNull();
    expect(loadPendingExpenseId()).toBeUndefined();
    mockStore.set('quickAdd.draft', JSON.stringify({ categoryId: 'food', amountMinor: -5 }));
    expect(loadDraft()).toBeNull();
    mockStore.set('quickAdd.draft', JSON.stringify({ categoryId: 'food', amountMinor: 5, details: { paymentMethod: 'bitcoin' } }));
    expect(loadDraft()).toBeNull();
  });
});
