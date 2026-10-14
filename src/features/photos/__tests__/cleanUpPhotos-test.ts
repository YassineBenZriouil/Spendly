import { existsSync, mkdtempSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createSqliteExpenseRepository, expenseRepository } from '@/domain/expense/expense.repository';
import { createExpense } from '@/domain/expense/expense.service';
import { ORPHAN_MIN_AGE_MS } from '@/domain/photo/photo';
import { saveDraft } from '@/features/quick-add/state/draftStorage';
import { undoStore } from '@/features/undo/state/undoStore';
import { DELETED_RETENTION_DAYS, purgeDeleted } from '@/storage/database/maintenance';
import { migrate } from '@/storage/database/migrations';
import { createTestDatabase } from '@/storage/database/testing/createTestDatabase';

import { cleanUpPhotos } from '../cleanUpPhotos';

jest.mock('expo-sqlite', () => ({}));
jest.mock('expo-sqlite/kv-store', () => {
  const items = new Map<string, string>();
  return {
    __esModule: true,
    default: {
      getItemSync: (key: string) => items.get(key) ?? null,
      setItemSync: (key: string, value: string) => items.set(key, value),
      removeItemSync: (key: string) => items.delete(key),
    },
  };
});
// The photo directory is a real temporary directory on disk
const mockPhotoDirectory = { path: '' };
jest.mock('@/storage/photos/photoFiles', () => {
  const fs = jest.requireActual<typeof import('node:fs')>('node:fs');
  const path = jest.requireActual<typeof import('node:path')>('node:path');
  return {
    storedPhotos: () =>
      fs.readdirSync(mockPhotoDirectory.path).map((name) => ({
        name,
        modifiedAt: fs.statSync(path.join(mockPhotoDirectory.path, name)).mtimeMs,
      })),
    deletePhoto: (name: string) => fs.unlinkSync(path.join(mockPhotoDirectory.path, name)),
  };
});

const DAY_MS = 24 * 60 * 60 * 1000;
const photo = (id: string) => `mgq1x2-${id}.jpg`;
const onDisk = (name: string) => existsSync(join(mockPhotoDirectory.path, name));

async function setup(now: number) {
  mockPhotoDirectory.path = mkdtempSync(join(tmpdir(), 'spendly-photos-'));
  const db = createTestDatabase();
  await migrate(db);
  const repository = createSqliteExpenseRepository(async () => db);
  jest.spyOn(expenseRepository, 'photoNames').mockImplementation(() => repository.photoNames());
  // Every file was written two hours ago, unless a test says otherwise
  const addFile = (name: string, age = 2 * 60 * 60 * 1000) => {
    const path = join(mockPhotoDirectory.path, name);
    writeFileSync(path, 'jpeg');
    utimesSync(path, new Date(now - age), new Date(now - age));
  };
  return { db, repository, addFile };
}

describe('cleanUpPhotos', () => {
  const now = Date.UTC(2026, 9, 14, 12);

  it('keeps every photo something refers to, and removes the rest', async () => {
    const { repository, addFile } = await setup(now);
    const live = createExpense({ amountMinor: 100, currencyCode: 'EUR', categoryId: 'food', photo: photo('live') });
    const deleted = createExpense({ amountMinor: 100, currencyCode: 'EUR', categoryId: 'food', photo: photo('deleted') });
    const edited = createExpense({ amountMinor: 100, currencyCode: 'EUR', categoryId: 'food', photo: photo('beforeedit') });
    await repository.saveMany([live, deleted]);
    await repository.remove(deleted.id);
    saveDraft({ categoryId: null, amountMinor: 0, details: { photo: photo('draft') } });
    undoStore.offer('edited', edited, now);
    for (const id of ['live', 'deleted', 'draft', 'beforeedit', 'replaced', 'abandoned']) addFile(photo(id));
    addFile(photo('justtaken'), 60 * 1000);
    addFile('notaphoto.txt');

    await cleanUpPhotos(now);

    for (const id of ['live', 'deleted', 'draft', 'beforeedit', 'justtaken']) expect(onDisk(photo(id))).toBe(true);
    expect(onDisk(photo('replaced'))).toBe(false);
    expect(onDisk(photo('abandoned'))).toBe(false);
    expect(onDisk('notaphoto.txt')).toBe(true);
  });

  it('removes a deleted expense’s photo once the 30-day purge removed the expense', async () => {
    const { db, repository, addFile } = await setup(now);
    const expense = createExpense({ amountMinor: 100, currencyCode: 'EUR', categoryId: 'food', photo: photo('old') });
    await repository.save(expense);
    await repository.remove(expense.id);
    addFile(photo('old'));
    saveDraft({ categoryId: null, amountMinor: 0 });

    await cleanUpPhotos(now);
    expect(onDisk(photo('old'))).toBe(true);

    await purgeDeleted(db, new Date(Date.now() + (DELETED_RETENTION_DAYS + 1) * DAY_MS));
    await cleanUpPhotos(now + ORPHAN_MIN_AGE_MS);
    expect(onDisk(photo('old'))).toBe(false);
  });
});
