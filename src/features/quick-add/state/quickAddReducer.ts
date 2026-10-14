import type { ExpenseDetails } from '@/domain/expense/expense.service';
import type { Frequency } from '@/domain/recurrence/recurrence.types';

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
  /** Repeat this expense (a rule is started when it is saved). */
  repeat?: Frequency;
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
  | { type: 'repeatChanged'; repeat: Frequency | null }
  | { type: 'saveRequested' }
  | { type: 'saveSucceeded'; expenseId: string }
  | { type: 'saveFailed'; message: string }
  | { type: 'savedAcknowledged' }
  /** The recovered draft turned out to be already saved (app was killed right after storing it). */
  | { type: 'draftDiscarded' }
  /** A habitual category for this time of day. Applies only to an untouched composer, never over the user's input. */
  | { type: 'categoryPreset'; categoryId: string };

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

/** Nothing chosen or typed yet. */
export function isUntouched({ categoryId, amountMinor, details = {}, repeat }: QuickAddDraft) {
  return categoryId === null && amountMinor === 0 && !repeat && !Object.values(details).some(Boolean);
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
    case 'detailsChanged':
      return withDraft(state, { ...state.draft, details: { ...state.draft.details, ...event.changes } });
    case 'repeatChanged': {
      const { repeat: _previous, ...draft } = state.draft;
      return withDraft(state, event.repeat ? { ...draft, repeat: event.repeat } : draft);
    }
    case 'saveRequested':
      return canSave(state.draft) ? { ...state, phase: 'saving', error: null } : state;
    case 'categoryPreset': {
      if (!isUntouched(state.draft)) return state;
      const draft = { ...state.draft, categoryId: event.categoryId };
      // Keeps showing "Saved" until it is acknowledged
      return state.phase === 'saved' ? { ...state, draft } : withDraft(state, draft);
    }
    case 'draftDiscarded':
      return initialQuickAddState;
    case 'savedAcknowledged':
      return state.phase === 'saved' ? { ...state, phase: restingPhase(state.draft) } : state;
    default:
      return state;
  }
}
