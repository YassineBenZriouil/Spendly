import { createExpense } from '@/domain/expense/expense.service';

import { UNDO_WINDOW_MS } from '../undoStore';

const mockDisk = new Map<string, string>();
jest.mock('expo-sqlite/kv-store', () => ({
  __esModule: true,
  default: {
    getItemSync: (key: string) => mockDisk.get(key) ?? null,
    setItemSync: (key: string, value: string) => mockDisk.set(key, value),
    removeItemSync: (key: string) => mockDisk.delete(key),
  },
}));

/** A fresh copy of the module: what the app sees after being closed and reopened. */
function relaunch(): typeof import('../undoStore') {
  let store!: typeof import('../undoStore');
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.isolateModules needs a synchronous require
    store = require('../undoStore');
  });
  return store;
}

const expense = createExpense({ amountMinor: 1250, currencyCode: 'EUR', categoryId: 'food' }, new Date('2026-10-13T12:00:00.000Z'));
const NOW = 1_000_000;

beforeEach(() => mockDisk.clear());

describe('undoStore', () => {
  it('still offers Undo after a restart, within the window', () => {
    relaunch().undoStore.offer('deleted', expense, NOW);
    const afterRestart = relaunch().undoStore;
    expect(afterRestart.get(NOW + UNDO_WINDOW_MS - 1)).toEqual({ kind: 'deleted', expense, expiresAt: NOW + UNDO_WINDOW_MS });
  });

  it('expires after the window', () => {
    relaunch().undoStore.offer('saved', expense, NOW);
    expect(relaunch().undoStore.get(NOW + UNDO_WINDOW_MS)).toBeNull();
  });

  it('keeps only the latest action, and clearing an older one leaves the newer alone', () => {
    const { undoStore } = relaunch();
    undoStore.offer('saved', expense, NOW);
    const older = undoStore.get(NOW);
    undoStore.offer('edited', { ...expense, amountMinor: 900 }, NOW + 10);
    undoStore.clear(older);
    expect(undoStore.get(NOW + 10)?.kind).toBe('edited');
    undoStore.clear();
    expect(relaunch().undoStore.get(NOW + 10)).toBeNull();
  });

  it('ignores corrupt or invalid stored data', () => {
    mockDisk.set('undo', '{nope');
    expect(relaunch().undoStore.get(NOW)).toBeNull();
    mockDisk.set('undo', JSON.stringify({ kind: 'teleported', expense, expiresAt: NOW + 1 }));
    expect(relaunch().undoStore.get(NOW)).toBeNull();
    mockDisk.set('undo', JSON.stringify({ kind: 'deleted', expense: { ...expense, amountMinor: 0 }, expiresAt: NOW + 1 }));
    expect(relaunch().undoStore.get(NOW)).toBeNull();
  });
});
