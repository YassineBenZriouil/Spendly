import { migrate } from '@/storage/database/migrations';
import { createTestDatabase } from '@/storage/database/testing/createTestDatabase';

import { BuiltInCategories } from '../builtInCategories';
import { createSqliteCategoryRepository } from '../category.repository';

jest.mock('expo-sqlite', () => ({}));

describe('SQLite category repository', () => {
  it('returns the seeded categories in order, mapped to domain objects', async () => {
    const db = createTestDatabase();
    await migrate(db);
    const repository = createSqliteCategoryRepository(async () => db);
    expect(await repository.list()).toEqual(BuiltInCategories);
  });
});
