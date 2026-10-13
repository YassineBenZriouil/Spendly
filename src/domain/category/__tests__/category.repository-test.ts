import { migrate } from '@/storage/database/migrations';
import { createTestDatabase } from '@/storage/database/testing/createTestDatabase';

import { BuiltInCategories } from '../builtInCategories';
import { createSqliteCategoryRepository } from '../category.repository';
import { createCategory } from '../category.service';

jest.mock('expo-sqlite', () => ({}));

async function setup() {
  const db = createTestDatabase();
  await migrate(db);
  return createSqliteCategoryRepository(async () => db);
}

const builtInIds = BuiltInCategories.map((category) => category.id);

describe('SQLite category repository', () => {
  it('returns the seeded categories in order, mapped to domain objects', async () => {
    const repository = await setup();
    expect(await repository.list()).toEqual(BuiltInCategories);
  });

  it('adds, renames, hides and reorders without changing ids', async () => {
    const repository = await setup();
    const listener = jest.fn();
    repository.subscribe(listener);
    const coffee = createCategory({ name: 'Coffee', icon: 'coffee', colorToken: 'amber' }, BuiltInCategories.length);
    await repository.add(coffee);
    await repository.update({ ...BuiltInCategories[0], name: 'Eating out', isVisible: false });

    let list = await repository.list();
    expect(list.at(-1)).toEqual(coffee);
    expect(list[0]).toMatchObject({ id: 'food', name: 'Eating out', isVisible: false });

    await repository.reorder([coffee.id, ...builtInIds]);
    list = await repository.list();
    expect(list.map((category) => category.id)).toEqual([coffee.id, ...builtInIds]);
    expect(listener).toHaveBeenCalledTimes(3);
  });

  it('restores built-in defaults and keeps custom categories after them', async () => {
    const repository = await setup();
    const coffee = createCategory({ name: 'Coffee', icon: 'coffee', colorToken: 'amber' }, 0);
    await repository.add(coffee);
    await repository.update({ ...BuiltInCategories[1], name: 'Rides', icon: 'fuel', isVisible: false });
    await repository.reorder([coffee.id, ...[...builtInIds].reverse()]);

    await repository.restoreDefaults();
    expect(await repository.list()).toEqual([...BuiltInCategories, { ...coffee, sortOrder: BuiltInCategories.length }]);
  });

  it('fails to update a missing category', async () => {
    const repository = await setup();
    await expect(repository.update({ ...BuiltInCategories[0], id: 'missing' })).rejects.toThrow('not found');
  });
});
