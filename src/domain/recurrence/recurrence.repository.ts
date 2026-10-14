import { expenseParams, INSERT_EXPENSE_SQL } from '@/domain/expense/expense.repository';
import { createExpense } from '@/domain/expense/expense.service';
import type { EntryKind, Expense, PaymentMethod } from '@/domain/expense/expense.types';
import { getDatabase } from '@/storage/database/connection';
import type { Db, SqlValue } from '@/storage/database/db.types';
import { createId } from '@/utils/ids';

import { dueOccurrences } from './recurrence.dates';
import type { Frequency, HandledOccurrence, Occurrence, OccurrenceOutcome, Recurrence } from './recurrence.types';

/** Missed occurrences older than this are no longer offered (nothing is saved for them). */
export const PENDING_WINDOW_MONTHS = 3;

type RecurrenceRow = {
  id: string;
  source_expense_id: string;
  frequency: Frequency;
  anchor_at: string;
  amount_minor: number;
  currency_code: string;
  category_id: string;
  title: string | null;
  note: string | null;
  payment_method: PaymentMethod | null;
  kind: EntryKind;
  active: number;
  created_at: string;
  updated_at: string;
};

type OccurrenceRow = {
  recurrence_id: string;
  occurrence: number;
  outcome: OccurrenceOutcome;
  expense_id: string | null;
  handled_at: string;
};

function fromRow(row: RecurrenceRow): Recurrence {
  return {
    id: row.id,
    sourceExpenseId: row.source_expense_id,
    frequency: row.frequency,
    anchorAt: row.anchor_at,
    template: {
      amountMinor: row.amount_minor,
      currencyCode: row.currency_code,
      categoryId: row.category_id,
      ...(row.title ? { title: row.title } : {}),
      ...(row.note ? { note: row.note } : {}),
      ...(row.payment_method ? { paymentMethod: row.payment_method } : {}),
      ...(row.kind === 'income' ? { kind: 'income' as const } : {}),
    },
    active: row.active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Insert that skips an id already present (also used by backup restore). */
export const INSERT_RECURRENCE_SQL = `INSERT INTO recurrences (id, source_expense_id, frequency, anchor_at, amount_minor, currency_code,
     category_id, title, note, payment_method, active, created_at, updated_at, kind)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
   ON CONFLICT (id) DO NOTHING`;

export function recurrenceParams(recurrence: Recurrence): SqlValue[] {
  const { template } = recurrence;
  return [
    recurrence.id,
    recurrence.sourceExpenseId,
    recurrence.frequency,
    recurrence.anchorAt,
    template.amountMinor,
    template.currencyCode,
    template.categoryId,
    template.title ?? null,
    template.note ?? null,
    template.paymentMethod ?? null,
    recurrence.active ? 1 : 0,
    recurrence.createdAt,
    recurrence.updatedAt,
    template.kind ?? 'expense',
  ];
}

export const INSERT_OCCURRENCE_SQL = `INSERT INTO recurrence_occurrences (recurrence_id, occurrence, outcome, expense_id, handled_at)
   VALUES (?, ?, ?, ?, ?)
   ON CONFLICT (recurrence_id, occurrence) DO NOTHING`;

export function occurrenceParams(handled: HandledOccurrence): SqlValue[] {
  return [handled.recurrenceId, handled.index, handled.outcome, handled.expenseId, handled.handledAt];
}

/** A new rule repeating `expense` from its own date and time. */
export function recurrenceFrom(expense: Expense, frequency: Frequency, now = new Date()): Recurrence {
  const { amountMinor, currencyCode, categoryId, title, note, paymentMethod, kind } = expense;
  return {
    id: createId(),
    sourceExpenseId: expense.id,
    frequency,
    anchorAt: expense.occurredAt,
    template: {
      amountMinor,
      currencyCode,
      categoryId,
      ...(title ? { title } : {}),
      ...(note ? { note } : {}),
      ...(paymentMethod ? { paymentMethod } : {}),
      ...(kind ? { kind } : {}),
    },
    active: true,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

/** The expense a confirmed occurrence becomes: the template, dated when it was due. */
export function expenseFor(occurrence: Occurrence, now = new Date(), id = createId()): Expense {
  return createExpense({ ...occurrence.template, occurredAt: occurrence.dueAt }, now, id);
}

export type RecurrenceRepository = {
  /** Saves `expense` and starts repeating it, in one transaction. */
  saveRepeating(expense: Expense, frequency: Frequency): Promise<Recurrence>;
  /** Starts repeating an expense that is already stored. Stops any rule it was part of first. */
  repeat(expense: Expense, frequency: Frequency): Promise<Recurrence>;
  /** No more occurrences become due (handled ones and their expenses stay). */
  stop(recurrenceId: string): Promise<void>;
  /** Stops the rules an expense started (e.g. when undoing the save that created them). */
  stopStartedBy(expenseId: string): Promise<void>;
  /** The active rule an expense belongs to: the one it started, or the one that created it. */
  forExpense(expenseId: string): Promise<Recurrence | null>;
  /** Due occurrences waiting for the user, newest first. */
  pending(now?: Date): Promise<Occurrence[]>;
  /** Saves the occurrence as a real expense dated when it was due. Fails if it was already handled. */
  confirm(occurrence: Occurrence): Promise<Expense>;
  skip(occurrence: Occurrence): Promise<void>;
  /** Makes a handled occurrence pending again (undo). */
  unhandle(recurrenceId: string, index: number): Promise<void>;
  /** Everything, for backups. */
  all(): Promise<{ recurrences: Recurrence[]; occurrences: HandledOccurrence[] }>;
  notifyChanged(): void;
  subscribe(listener: () => void): () => void;
};

export function createSqliteRecurrenceRepository(database: () => Promise<Db>): RecurrenceRepository {
  const listeners = new Set<() => void>();
  const changed = () => listeners.forEach((listener) => listener());

  const insertRule = async (txn: Db, recurrence: Recurrence) => {
    await txn.runAsync(INSERT_RECURRENCE_SQL, recurrenceParams(recurrence));
  };

  const forExpense = async (expenseId: string) => {
    const db = await database();
    const row = await db.getFirstAsync<RecurrenceRow>(
      `SELECT * FROM recurrences
       WHERE active = 1 AND (source_expense_id = ?
         OR id IN (SELECT recurrence_id FROM recurrence_occurrences WHERE expense_id = ?))
       ORDER BY created_at DESC LIMIT 1`,
      [expenseId, expenseId],
    );
    return row ? fromRow(row) : null;
  };

  const handle = async (occurrence: Occurrence, outcome: OccurrenceOutcome, expense: Expense | null) => {
    const db = await database();
    await db.withExclusiveTransactionAsync(async (txn) => {
      // No ON CONFLICT: the primary key rejects a second Confirm / Skip of the same occurrence (e.g. a double tap)
      await txn.runAsync(
        'INSERT INTO recurrence_occurrences (recurrence_id, occurrence, outcome, expense_id, handled_at) VALUES (?, ?, ?, ?, ?)',
        [occurrence.recurrenceId, occurrence.index, outcome, expense?.id ?? null, new Date().toISOString()],
      );
      if (expense) await txn.runAsync(INSERT_EXPENSE_SQL, expenseParams(expense));
    });
    changed();
  };

  return {
    async saveRepeating(expense, frequency) {
      const db = await database();
      const recurrence = recurrenceFrom(expense, frequency);
      await db.withExclusiveTransactionAsync(async (txn) => {
        await txn.runAsync(INSERT_EXPENSE_SQL, expenseParams(expense));
        await insertRule(txn, recurrence);
      });
      changed();
      return recurrence;
    },

    async repeat(expense, frequency) {
      const db = await database();
      const recurrence = recurrenceFrom(expense, frequency);
      const existing = await forExpense(expense.id);
      await db.withExclusiveTransactionAsync(async (txn) => {
        if (existing) {
          await txn.runAsync('UPDATE recurrences SET active = 0, updated_at = ? WHERE id = ?', [recurrence.createdAt, existing.id]);
        }
        await insertRule(txn, recurrence);
      });
      changed();
      return recurrence;
    },

    async stop(recurrenceId) {
      const db = await database();
      await db.runAsync('UPDATE recurrences SET active = 0, updated_at = ? WHERE id = ?', [new Date().toISOString(), recurrenceId]);
      changed();
    },

    async stopStartedBy(expenseId) {
      const db = await database();
      await db.runAsync('UPDATE recurrences SET active = 0, updated_at = ? WHERE source_expense_id = ? AND active = 1', [
        new Date().toISOString(),
        expenseId,
      ]);
      changed();
    },

    forExpense,

    async pending(now = new Date()) {
      const db = await database();
      const [rules, handled] = await Promise.all([
        db.getAllAsync<RecurrenceRow>('SELECT * FROM recurrences WHERE active = 1', []),
        db.getAllAsync<OccurrenceRow>(
          'SELECT recurrence_id, occurrence FROM recurrence_occurrences WHERE recurrence_id IN (SELECT id FROM recurrences WHERE active = 1)',
          [],
        ),
      ]);
      // Same date and time, 3 months back (not the 1st of that month)
      const windowStart = new Date(now);
      windowStart.setMonth(windowStart.getMonth() - PENDING_WINDOW_MONTHS);
      const occurrences: Occurrence[] = [];
      for (const row of rules) {
        const rule = fromRow(row);
        const done = new Set(handled.filter((h) => h.recurrence_id === rule.id).map((h) => h.occurrence));
        for (const { index, dueAt } of dueOccurrences(new Date(rule.anchorAt), rule.frequency, done, now, windowStart)) {
          occurrences.push({ recurrenceId: rule.id, index, dueAt: dueAt.toISOString(), frequency: rule.frequency, template: rule.template });
        }
      }
      return occurrences.sort((a, b) => b.dueAt.localeCompare(a.dueAt));
    },

    async confirm(occurrence) {
      const expense = expenseFor(occurrence);
      await handle(occurrence, 'confirmed', expense);
      return expense;
    },

    skip: (occurrence) => handle(occurrence, 'skipped', null),

    async unhandle(recurrenceId, index) {
      const db = await database();
      await db.runAsync('DELETE FROM recurrence_occurrences WHERE recurrence_id = ? AND occurrence = ?', [recurrenceId, index]);
      changed();
    },

    async all() {
      const db = await database();
      const [rules, handled] = await Promise.all([
        db.getAllAsync<RecurrenceRow>('SELECT * FROM recurrences ORDER BY created_at', []),
        db.getAllAsync<OccurrenceRow>('SELECT * FROM recurrence_occurrences ORDER BY recurrence_id, occurrence', []),
      ]);
      return {
        recurrences: rules.map(fromRow),
        occurrences: handled.map((row) => ({
          recurrenceId: row.recurrence_id,
          index: row.occurrence,
          outcome: row.outcome,
          expenseId: row.expense_id,
          handledAt: row.handled_at,
        })),
      };
    },

    notifyChanged: changed,

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export const recurrenceRepository = createSqliteRecurrenceRepository(getDatabase);
