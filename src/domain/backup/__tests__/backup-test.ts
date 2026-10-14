import { BuiltInCategories } from '@/domain/category/builtInCategories';
import { createSqliteCategoryRepository } from '@/domain/category/category.repository';
import { createCategory } from '@/domain/category/category.service';
import { createSqliteExpenseRepository } from '@/domain/expense/expense.repository';
import { createSqliteRecurrenceRepository } from '@/domain/recurrence/recurrence.repository';
import { createExpense, updateExpense } from '@/domain/expense/expense.service';
import { migrate } from '@/storage/database/migrations';
import { createTestDatabase } from '@/storage/database/testing/createTestDatabase';

import { BACKUP_FORMAT, createBackup, parseBackup, type Backup } from '../backup';
import { restoreBackup } from '../backup.repository';

jest.mock('expo-sqlite', () => ({}));

async function phone() {
  const db = createTestDatabase();
  await migrate(db);
  const database = async () => db;
  return {
    db,
    expenses: createSqliteExpenseRepository(database),
    categories: createSqliteCategoryRepository(database),
    recurrences: createSqliteRecurrenceRepository(database),
  };
}

const coffee = createCategory({ name: 'Coffee', icon: 'coffee', colorToken: 'amber' }, 10, new Date('2026-02-01T00:00:00.000Z'));
const expenses = [
  createExpense({ amountMinor: 450, currencyCode: 'EUR', categoryId: coffee.id, title: 'Flat white' }, new Date('2026-10-01T08:00:00.000Z')),
  createExpense({ amountMinor: 3000, currencyCode: 'MAD', categoryId: 'food', paymentMethod: 'cash' }, new Date('2026-10-02T12:00:00.000Z')),
];

/** A backup made on one phone, as the file text that would be shared. */
async function backupFromFirstPhone() {
  const first = await phone();
  await first.categories.add(coffee);
  await first.expenses.saveMany(expenses);
  const backup = createBackup({
    expenses: await first.expenses.search({}),
    categories: await first.categories.list(),
    preferences: { currencyCode: 'EUR', theme: 'dark' },
  });
  return JSON.stringify(backup);
}

const parsed = (text: string): Backup => {
  const result = parseBackup(text);
  if (!result.ok) throw new Error(result.reason);
  return result.backup;
};

describe('backup', () => {
  it('restores everything on another phone exactly', async () => {
    const backup = parsed(await backupFromFirstPhone());
    const second = await phone();
    const result = await restoreBackup(second.db, backup);

    expect(result).toEqual({
      expensesAdded: 2,
      expensesAlreadyHere: 0,
      categoriesAdded: 1,
      categoriesAlreadyHere: BuiltInCategories.length,
    });
    for (const expense of expenses) expect(await second.expenses.get(expense.id)).toEqual(expense);
    expect((await second.categories.list()).find((category) => category.id === coffee.id)).toEqual(coffee);
    expect(backup.preferences).toEqual({ currencyCode: 'EUR', theme: 'dark' });
  });

  it('restoring the same file twice adds nothing the second time', async () => {
    const backup = parsed(await backupFromFirstPhone());
    const second = await phone();
    await restoreBackup(second.db, backup);
    const again = await restoreBackup(second.db, backup);
    expect(again.expensesAdded).toBe(0);
    expect(again.categoriesAdded).toBe(0);
    expect(await second.expenses.search({})).toHaveLength(2);
  });

  it('never overwrites what is already on the phone', async () => {
    const backup = parsed(await backupFromFirstPhone());
    const second = await phone();
    await second.categories.add(coffee);
    const edited = updateExpense(expenses[0], { amountMinor: 999, title: 'Edited here' });
    await second.expenses.save(expenses[0]);
    await second.expenses.update(edited);

    const result = await restoreBackup(second.db, backup);
    expect(result.expensesAdded).toBe(1);
    expect(result.expensesAlreadyHere).toBe(1);
    expect(await second.expenses.get(expenses[0].id)).toEqual(edited);
  });

  it('writes nothing at all if any insert fails', async () => {
    const second = await phone();
    const broken = parsed(await backupFromFirstPhone());
    // Bypasses validation on purpose: an expense whose category exists nowhere fails the foreign key
    const backup = { ...broken, expenses: [...broken.expenses, { ...expenses[1], id: 'orphan', categoryId: 'nowhere' }] };
    await expect(restoreBackup(second.db, backup)).rejects.toThrow();
    expect(await second.expenses.search({})).toEqual([]);
    expect((await second.categories.list()).some((category) => category.id === coffee.id)).toBe(false);
  });
});

describe('parseBackup', () => {
  const valid = async () => JSON.parse(await backupFromFirstPhone());
  const reason = (value: unknown) => {
    const result = parseBackup(typeof value === 'string' ? value : JSON.stringify(value));
    return result.ok ? null : result.reason;
  };

  it('rejects files that are not Spendly backups', async () => {
    expect(reason('not json {')).toMatch(/isn't a Spendly backup/);
    expect(reason({ app: 'other', format: 1 })).toMatch(/isn't a Spendly backup/);
    expect(reason({ ...(await valid()), expenses: 'nope' })).toMatch(/isn't a Spendly backup/);
  });

  it('rejects a newer format with a clear reason', async () => {
    expect(reason({ ...(await valid()), format: BACKUP_FORMAT + 1 })).toMatch(/newer version/);
  });

  it('rejects the whole file when any record is damaged (never a partial restore)', async () => {
    const file = await valid();
    expect(reason({ ...file, expenses: [...file.expenses, { ...file.expenses[0], id: 'x', amountMinor: -5 }] })).toMatch(
      /1 unreadable expense\b/,
    );
    expect(reason({ ...file, expenses: [{ ...file.expenses[0], occurredAt: undefined }] })).toMatch(/unreadable expense/);
    expect(reason({ ...file, categories: [...file.categories, { ...file.categories[0], icon: 'rocket' }] })).toMatch(
      /unreadable category/,
    );
    expect(reason({ ...file, expenses: [...file.expenses, file.expenses[0]] })).toMatch(/appear twice/);
    // Its custom category is not in the file (built-in ones always are known)
    const inCoffee = file.expenses.find((expense: { categoryId: string }) => expense.categoryId === coffee.id);
    expect(reason({ ...file, categories: [], expenses: [inCoffee] })).toMatch(/missing/);
  });

  it('accepts a valid file and keeps only known expense fields', async () => {
    const file = await valid();
    file.expenses[0].extra = 'ignored';
    const result = parseBackup(JSON.stringify(file));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.backup.expenses[0]).not.toHaveProperty('extra');
  });
});

describe('backup format 2: repeating expenses', () => {
  it('carries rules and confirmed / skipped occurrences to another phone', async () => {
    const first = await phone();
    await first.categories.add(coffee);
    const source = expenses[0];
    await first.recurrences.saveRepeating(source, 'daily');
    const [, second] = await first.recurrences.pending(new Date('2026-10-04T12:00:00.000Z'));
    const confirmed = await first.recurrences.confirm(second);
    const file = JSON.stringify(
      createBackup({
        expenses: await first.expenses.search({}),
        categories: await first.categories.list(),
        preferences: {},
        ...(await first.recurrences.all()),
      }),
    );

    const target = await phone();
    await restoreBackup(target.db, parsed(file));
    expect(await target.expenses.get(confirmed.id)).toEqual(confirmed);
    expect((await target.recurrences.forExpense(source.id))?.frequency).toBe('daily');
    // The confirmed occurrence stays handled on the new phone: it is not offered again
    const pendingIndexes = (await target.recurrences.pending(new Date('2026-10-04T12:00:00.000Z'))).map((o) => o.index);
    expect(pendingIndexes).not.toContain(second.index);
  });

  it('still reads format 2 files (before income)', async () => {
    const file = { ...JSON.parse(await backupFromFirstPhone()), format: 2 };
    const result = parseBackup(JSON.stringify(file));
    expect(result.ok && result.backup.expenses).toHaveLength(2);
  });

  it('still reads format 1 files (no repeating expenses)', async () => {
    const file = { ...JSON.parse(await backupFromFirstPhone()), format: 1 };
    delete file.recurrences;
    delete file.occurrences;
    const result = parseBackup(JSON.stringify(file));
    expect(result.ok && result.backup.recurrences).toEqual([]);
  });

  it('rejects a file whose repeat refers to a rule or category that is missing', async () => {
    const file = JSON.parse(await backupFromFirstPhone());
    const reason = (value: unknown) => {
      const result = parseBackup(JSON.stringify(value));
      return result.ok ? null : result.reason;
    };
    expect(reason({ ...file, occurrences: [{ recurrenceId: 'nowhere', index: 1, outcome: 'skipped', expenseId: null, handledAt: file.createdAt }] })).toMatch(
      /repeating expenses/,
    );
    expect(reason({ ...file, recurrences: [{ id: 'r', frequency: 'hourly' }] })).toMatch(/repeating expenses/);
  });
});


describe('backup format 3: income and budgets', () => {
  it('keeps income as income and carries the budget in the settings', async () => {
    const first = await phone();
    const salary = createExpense({ amountMinor: 250000, currencyCode: 'EUR', categoryId: 'other', kind: 'income' });
    await first.expenses.save(salary);
    const budget = { currencyCode: 'EUR', monthlyMinor: 80000, byCategory: { food: 30000 } };
    const backup = parsed(
      JSON.stringify(createBackup({ expenses: await first.expenses.search({}), categories: await first.categories.list(), preferences: { budget } })),
    );
    expect(backup.format).toBe(BACKUP_FORMAT);
    expect(backup.preferences.budget).toEqual(budget);

    const second = await phone();
    await restoreBackup(second.db, backup);
    expect((await second.expenses.get(salary.id))?.kind).toBe('income');
  });
});

describe('backup format 4: receipt photos', () => {
  // A tiny JPEG start (SOI + APP0), enough for the parser's checks
  const jpeg = btoa(String.fromCharCode(0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49));
  const withPhoto = createExpense(
    { amountMinor: 1200, currencyCode: 'EUR', categoryId: 'food', photo: 'mgq1x2-a1b2c3d4e5.jpg' },
    new Date('2026-10-03T12:00:00.000Z'),
  );
  const file = (photos: unknown[], expenses = [withPhoto]) =>
    JSON.stringify({ ...createBackup({ expenses, categories: [], preferences: {} }), photos });
  const reason = (text: string) => {
    const result = parseBackup(text);
    return result.ok ? null : result.reason;
  };

  it('carries photos with their expenses', () => {
    const backup = parsed(file([{ name: withPhoto.photo, data: jpeg }]));
    expect(backup.photos).toEqual([{ name: withPhoto.photo, data: jpeg }]);
    expect(backup.expenses[0].photo).toBe(withPhoto.photo);
  });

  it('rejects the whole file when a photo is missing, damaged, unsafe or doubled', () => {
    expect(reason(file([]))).toMatch(/photos are missing or damaged/);
    expect(reason(file([{ name: withPhoto.photo, data: btoa('not a jpeg at all') }]))).toMatch(/photos/);
    expect(reason(file([{ name: withPhoto.photo, data: 'not base64!' }]))).toMatch(/photos/);
    expect(reason(file([{ name: withPhoto.photo, data: jpeg }, { name: '../spendly.db', data: jpeg }]))).toMatch(/photos/);
    expect(reason(file([{ name: withPhoto.photo, data: jpeg }, { name: withPhoto.photo, data: jpeg }]))).toMatch(/photos/);
    expect(reason(file([null]))).toMatch(/photos/);
  });

  it('rejects an expense whose photo name could point outside the photo folder', () => {
    expect(reason(file([], [{ ...withPhoto, photo: '../../spendly.db' }]))).toMatch(/unreadable expense/);
  });

  it('still reads format 3 files (no photos)', () => {
    const backup = parsed(JSON.stringify({ ...JSON.parse(file([], [expenses[1]])), format: 3, photos: undefined }));
    expect(backup.photos).toEqual([]);
  });

  it('stores the photo name with the restored expense', async () => {
    const second = await phone();
    await restoreBackup(second.db, parsed(file([{ name: withPhoto.photo, data: jpeg }])));
    expect((await second.expenses.get(withPhoto.id))?.photo).toBe(withPhoto.photo);
    expect(await second.expenses.photoNames()).toEqual([withPhoto.photo]);
  });
});
