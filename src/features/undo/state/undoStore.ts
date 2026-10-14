import Storage from 'expo-sqlite/kv-store';

import { parseExpense } from '@/domain/expense/expense.parse';
import type { Expense } from '@/domain/expense/expense.types';

/**
 * - saved: an expense was just added (undo removes it)
 * - deleted: an expense was just deleted (undo restores it)
 * - edited: an expense was just changed; `expense` is the version before the edit (undo puts it back)
 */
export type UndoKind = 'saved' | 'deleted' | 'edited';
export type UndoAction = { kind: UndoKind; expense: Expense; expiresAt: number };

export const UNDO_WINDOW_MS = 5000;
const KEY = 'undo';
const KINDS: UndoKind[] = ['saved', 'deleted', 'edited'];

/** `undefined` until read from disk once. */
let current: UndoAction | null | undefined;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

function load(): UndoAction | null {
  try {
    const raw = Storage.getItemSync(KEY);
    const stored: unknown = raw ? JSON.parse(raw) : null;
    if (!stored || typeof stored !== 'object') return null;
    const { kind, expense, expiresAt } = stored as Record<string, unknown>;
    const parsed = parseExpense(expense);
    if (!KINDS.includes(kind as UndoKind) || typeof expiresAt !== 'number' || !parsed) return null;
    return { kind: kind as UndoKind, expense: parsed, expiresAt };
  } catch {
    return null;
  }
}

function write(action: UndoAction | null) {
  try {
    if (action) Storage.setItemSync(KEY, JSON.stringify(action));
    else Storage.removeItemSync(KEY);
  } catch {
    // Undo still works for this session; only the after-restart copy is lost
  }
}

/**
 * The single undoable action (the latest one replaces any earlier one). Kept on disk with its expiry, so Undo is still
 * offered if the app is closed and reopened within the window.
 */
export const undoStore = {
  /** The pending action, or null if there is none or it has expired. */
  get(now = Date.now()): UndoAction | null {
    if (current === undefined) current = load();
    return current && current.expiresAt > now ? current : null;
  },
  offer(kind: UndoKind, expense: Expense, now = Date.now()) {
    current = { kind, expense, expiresAt: now + UNDO_WINDOW_MS };
    write(current);
    notify();
  },
  /** Removes `action` if it is still the pending one (a newer action is left alone). */
  clear(action?: UndoAction | null) {
    if (action && current !== action) return;
    current = null;
    write(null);
    notify();
  },
  /** Puts back an action whose undo failed, so the user can try again. */
  reinstate(action: UndoAction) {
    current = action;
    write(action);
    notify();
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
