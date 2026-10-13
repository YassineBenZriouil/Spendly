import {
  initialQuickAddState,
  quickAddReducer,
  restoreDraft,
  type QuickAddEvent,
  type QuickAddState,
} from '../quickAddReducer';

const run = (events: QuickAddEvent[], from: QuickAddState = initialQuickAddState) =>
  events.reduce(quickAddReducer, from);

const readyToSave = run([
  { type: 'selectCategory', categoryId: 'food' },
  { type: 'dragStarted' },
  { type: 'dragEnded', amountMinor: 1250 },
]);

describe('quickAddReducer', () => {
  it('walks the happy path', () => {
    expect(run([{ type: 'selectCategory', categoryId: 'food' }]).phase).toBe('categorySelected');
    expect(run([{ type: 'dragStarted' }]).phase).toBe('adjustingAmount');
    expect(readyToSave.phase).toBe('readyToSave');

    const saving = quickAddReducer(readyToSave, { type: 'saveRequested' });
    expect(saving.phase).toBe('saving');

    const saved = quickAddReducer(saving, { type: 'saveSucceeded', expenseId: 'e1' });
    expect(saved).toMatchObject({ phase: 'saved', lastSavedId: 'e1', draft: { categoryId: null, amountMinor: 0 } });

    expect(quickAddReducer(saved, { type: 'savedAcknowledged' }).phase).toBe('ready');
  });

  it('cannot save without a category or amount', () => {
    expect(run([{ type: 'saveRequested' }]).phase).toBe('ready');
    expect(run([{ type: 'selectCategory', categoryId: 'food' }, { type: 'saveRequested' }]).phase).toBe(
      'categorySelected',
    );
    expect(run([{ type: 'amountChanged', amountMinor: 500 }, { type: 'saveRequested' }]).phase).toBe('ready');
  });

  it('ignores a second save request and edits while saving', () => {
    const saving = run([{ type: 'saveRequested' }], readyToSave);
    expect(run([{ type: 'saveRequested' }], saving)).toBe(saving);
    expect(run([{ type: 'amountChanged', amountMinor: 1 }], saving)).toBe(saving);
    expect(run([{ type: 'selectCategory', categoryId: 'bills' }], saving)).toBe(saving);
  });

  it('keeps the draft when saving fails and allows a retry', () => {
    const failed = run([{ type: 'saveRequested' }, { type: 'saveFailed', message: 'disk full' }], readyToSave);
    expect(failed).toMatchObject({ phase: 'error', error: 'disk full', draft: readyToSave.draft });
    expect(quickAddReducer(failed, { type: 'saveRequested' }).phase).toBe('saving');
  });

  it('clears the error when the draft is edited', () => {
    const failed = run([{ type: 'saveRequested' }, { type: 'saveFailed', message: 'x' }], readyToSave);
    expect(quickAddReducer(failed, { type: 'amountChanged', amountMinor: 900 })).toMatchObject({
      phase: 'readyToSave',
      error: null,
    });
  });

  it('lets the next expense start while the saved confirmation is showing', () => {
    const saved = run([{ type: 'saveRequested' }, { type: 'saveSucceeded', expenseId: 'e1' }], readyToSave);
    const next = quickAddReducer(saved, { type: 'selectCategory', categoryId: 'bills' });
    expect(next.phase).toBe('categorySelected');
    expect(quickAddReducer(next, { type: 'savedAcknowledged' })).toBe(next);
  });

  it('restores a recovered draft into the matching phase', () => {
    expect(restoreDraft({ categoryId: 'food', amountMinor: 1250 }).phase).toBe('readyToSave');
    expect(restoreDraft({ categoryId: 'food', amountMinor: 0 }).phase).toBe('categorySelected');
    expect(restoreDraft({ categoryId: null, amountMinor: 300 }).phase).toBe('ready');
  });

  it('returns to zero via amountChanged (reset)', () => {
    expect(run([{ type: 'amountChanged', amountMinor: 0 }], readyToSave).phase).toBe('categorySelected');
  });

  it('merges details into the draft, keeps them through errors and clears them after saving', () => {
    const withDetails = run(
      [
        { type: 'detailsChanged', changes: { title: 'Lunch' } },
        { type: 'detailsChanged', changes: { paymentMethod: 'card' } },
      ],
      readyToSave,
    );
    expect(withDetails).toMatchObject({ phase: 'readyToSave', draft: { details: { title: 'Lunch', paymentMethod: 'card' } } });

    const saving = quickAddReducer(withDetails, { type: 'saveRequested' });
    expect(quickAddReducer(saving, { type: 'detailsChanged', changes: { title: 'x' } })).toBe(saving); // frozen while saving
    expect(quickAddReducer(saving, { type: 'saveFailed', message: 'disk full' }).draft.details).toEqual({ title: 'Lunch', paymentMethod: 'card' });
    expect(quickAddReducer(saving, { type: 'saveSucceeded', expenseId: 'e1' }).draft.details).toBeUndefined();
  });
});
