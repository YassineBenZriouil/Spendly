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

  it('drops a recovered draft that was already saved, but never mid-save', () => {
    expect(quickAddReducer(readyToSave, { type: 'draftDiscarded' })).toEqual(initialQuickAddState);
    const saving = quickAddReducer(readyToSave, { type: 'saveRequested' });
    expect(quickAddReducer(saving, { type: 'draftDiscarded' })).toBe(saving);
  });

  describe('categoryPreset', () => {
    const preset = { type: 'categoryPreset', categoryId: 'food' } as const;

    it('selects the category on an untouched composer', () => {
      const state = run([preset]);
      expect(state.draft.categoryId).toBe('food');
      expect(state.phase).toBe('categorySelected');
    });

    it('never overrides anything the user has done', () => {
      expect(run([{ type: 'selectCategory', categoryId: 'bills' }, preset]).draft.categoryId).toBe('bills');
      expect(run([{ type: 'amountChanged', amountMinor: 500 }, preset]).draft.categoryId).toBeNull();
      expect(run([{ type: 'detailsChanged', changes: { note: 'x' } }, preset]).draft.categoryId).toBeNull();
      expect(run([{ type: 'saveRequested' }, preset], readyToSave).draft.categoryId).toBe('food');
    });

    it('keeps the saved confirmation showing, then rests on the preset category', () => {
      const saved = run([{ type: 'saveRequested' }, { type: 'saveSucceeded', expenseId: 'e1' }], readyToSave);
      const presetWhileSaved = quickAddReducer(saved, { type: 'categoryPreset', categoryId: 'transport' });
      expect(presetWhileSaved.phase).toBe('saved');
      expect(presetWhileSaved.draft.categoryId).toBe('transport');
      expect(quickAddReducer(presetWhileSaved, { type: 'savedAcknowledged' }).phase).toBe('categorySelected');
    });
  });

  it('sets and clears Repeat, keeps it through errors, and resets it after saving', () => {
    const withRepeat = run([{ type: 'repeatChanged', repeat: 'monthly' }], readyToSave);
    expect(withRepeat.draft.repeat).toBe('monthly');
    expect(run([{ type: 'repeatChanged', repeat: null }], withRepeat).draft).not.toHaveProperty('repeat');
    const failed = run([{ type: 'saveRequested' }, { type: 'saveFailed', message: 'x' }], withRepeat);
    expect(failed.draft.repeat).toBe('monthly');
    const saved = run([{ type: 'saveRequested' }, { type: 'saveSucceeded', expenseId: 'e1' }], withRepeat);
    expect(saved.draft).not.toHaveProperty('repeat');
  });

  it('a draft with only Repeat set is not untouched (no preselection over it)', () => {
    const state = run([{ type: 'repeatChanged', repeat: 'weekly' }, { type: 'categoryPreset', categoryId: 'food' }]);
    expect(state.draft.categoryId).toBeNull();
  });
});
