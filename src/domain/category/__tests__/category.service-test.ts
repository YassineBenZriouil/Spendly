import { createCategory, editCategory, moveCategory, validateCategoryName } from '../category.service';

describe('category service', () => {
  it('validates names', () => {
    expect(validateCategoryName('  ')).not.toBeNull();
    expect(validateCategoryName('x'.repeat(25))).not.toBeNull();
    expect(validateCategoryName(' Coffee ')).toBeNull();
  });

  it('creates visible custom categories with trimmed names', () => {
    const category = createCategory({ name: ' Coffee ', icon: 'coffee', colorToken: 'amber' }, 10);
    expect(category).toMatchObject({ name: 'Coffee', isBuiltIn: false, isVisible: true, sortOrder: 10 });
    expect(() => createCategory({ name: '', icon: 'coffee', colorToken: 'amber' }, 0)).toThrow();
  });

  it('keeps the id when renamed', () => {
    const category = createCategory({ name: 'Coffee', icon: 'coffee', colorToken: 'amber' }, 0);
    const renamed = editCategory(category, { name: 'Cafés', icon: 'food', colorToken: 'coral' });
    expect(renamed).toMatchObject({ id: category.id, name: 'Cafés', icon: 'food', colorToken: 'coral' });
  });

  it('moves a category up or down, not past the edges', () => {
    expect(moveCategory(['a', 'b', 'c'], 'b', -1)).toEqual(['b', 'a', 'c']);
    expect(moveCategory(['a', 'b', 'c'], 'b', 1)).toEqual(['a', 'c', 'b']);
    expect(moveCategory(['a', 'b', 'c'], 'a', -1)).toBeNull();
    expect(moveCategory(['a', 'b', 'c'], 'c', 1)).toBeNull();
  });
});
