export type QuickAddPhase =
  | 'ready'
  | 'categorySelected'
  | 'adjustingAmount'
  | 'readyToSave'
  | 'saving'
  | 'saved'
  | 'error';

export type QuickAddDraft = {
  categoryId: string | null;
  amountMinor: number;
};

export type QuickAddState = {
  phase: QuickAddPhase;
  draft: QuickAddDraft;
  lastSavedId: string | null;
  error: string | null;
};

export type QuickAddEvent =
  | { type: 'selectCategory'; categoryId: string }
  | { type: 'dragStarted' }
  | { type: 'dragEnded'; amountMinor: number }
  | { type: 'amountChanged'; amountMinor: number }
  | { type: 'saveRequested' }
  | { type: 'saveSucceeded'; expenseId: string }
  | { type: 'saveFailed'; message: string }
  | { type: 'savedAcknowledged' };

const emptyDraft: QuickAddDraft = { categoryId: null, amountMinor: 0 };

export const initialQuickAddState: QuickAddState = {
  phase: 'ready',
  draft: emptyDraft,
  lastSavedId: null,
  error: null,
};

export function canSave(draft: QuickAddDraft) {
  return draft.categoryId !== null && draft.amountMinor > 0;
}

/** The resting phase a draft implies once nothing is in progress. */
function restingPhase(draft: QuickAddDraft): QuickAddPhase {
  if (canSave(draft)) return 'readyToSave';
  return draft.categoryId ? 'categorySelected' : 'ready';
}

function withDraft(state: QuickAddState, draft: QuickAddDraft): QuickAddState {
  return { ...state, draft, phase: restingPhase(draft), error: null };
}

export function quickAddReducer(state: QuickAddState, event: QuickAddEvent): QuickAddState {
  // While saving, the draft is frozen: only the save outcome is accepted (prevents double saves and lost edits)
  if (state.phase === 'saving') {
    if (event.type === 'saveSucceeded') {
      return { phase: 'saved', draft: emptyDraft, lastSavedId: event.expenseId, error: null };
    }
    if (event.type === 'saveFailed') {
      return { ...state, phase: 'error', error: event.message };
    }
    return state;
  }

  switch (event.type) {
    case 'selectCategory':
      return withDraft(state, { ...state.draft, categoryId: event.categoryId });
    case 'dragStarted':
      return { ...state, phase: 'adjustingAmount', error: null };
    case 'dragEnded':
    case 'amountChanged':
      return withDraft(state, { ...state.draft, amountMinor: event.amountMinor });
    case 'saveRequested':
      return canSave(state.draft) ? { ...state, phase: 'saving', error: null } : state;
    case 'savedAcknowledged':
      return state.phase === 'saved' ? { ...state, phase: restingPhase(state.draft) } : state;
    default:
      return state;
  }
}
