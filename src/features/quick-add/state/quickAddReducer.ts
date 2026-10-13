import type { ExpenseDetails } from '@/domain/expense/expense.service';

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
  /** Optional title, note, date and payment method. Kept while the details panel is closed. */
  details?: ExpenseDetails;
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
  | { type: 'detailsChanged'; changes: ExpenseDetails }
  | { type: 'saveRequested' }
  /** `keepCategoryId`: the "Last used" preference keeps the category selected for the next expense. */
  | { type: 'saveSucceeded'; expenseId: string; keepCategoryId?: string }
  | { type: 'saveFailed'; message: string }
  | { type: 'savedAcknowledged' }
  /** The recovered draft turned out to be already saved (app was killed right after storing it). */
  | { type: 'draftDiscarded' };

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

/** State to start from when an unsaved draft was recovered from storage. */
export function restoreDraft(draft: QuickAddDraft): QuickAddState {
  return { ...initialQuickAddState, draft, phase: restingPhase(draft) };
}

function withDraft(state: QuickAddState, draft: QuickAddDraft): QuickAddState {
  return { ...state, draft, phase: restingPhase(draft), error: null };
}

export function quickAddReducer(state: QuickAddState, event: QuickAddEvent): QuickAddState {
  // While saving, the draft is frozen: only the save outcome is accepted (prevents double saves and lost edits)
  if (state.phase === 'saving') {
    if (event.type === 'saveSucceeded') {
      const draft = event.keepCategoryId ? { ...emptyDraft, categoryId: event.keepCategoryId } : emptyDraft;
      return { phase: 'saved', draft, lastSavedId: event.expenseId, error: null };
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
    case 'detailsChanged':
      return withDraft(state, { ...state.draft, details: { ...state.draft.details, ...event.changes } });
    case 'saveRequested':
      return canSave(state.draft) ? { ...state, phase: 'saving', error: null } : state;
    case 'draftDiscarded':
      return initialQuickAddState;
    case 'savedAcknowledged':
      return state.phase === 'saved' ? { ...state, phase: restingPhase(state.draft) } : state;
    default:
      return state;
  }
}
