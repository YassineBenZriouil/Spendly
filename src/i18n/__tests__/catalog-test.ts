import { ar } from '../locales/ar';
import { en, type MessageKey } from '../locales/en';
import type { Message } from '../types';

const keys = Object.keys(en) as MessageKey[];
const placeholders = (message: Message) =>
  [...new Set((typeof message === 'string' ? message : Object.values(message).join(' ')).match(/\{\w+\}/g) ?? [])].sort();

describe('translation catalogs', () => {
  it('Arabic has every English key, and nothing else', () => {
    expect(keys.filter((key) => !(key in ar))).toEqual([]);
    expect(Object.keys(ar).filter((key) => !(key in en))).toEqual([]);
  });

  it.each(keys)('%s: same kind and same placeholders in Arabic', (key) => {
    const english = en[key] as Message;
    const arabic = ar[key] as Message;
    expect(typeof arabic).toBe(typeof english);
    expect(placeholders(arabic)).toEqual(placeholders(english));
    if (typeof arabic === 'object') {
      // Arabic needs all six plural forms
      expect(Object.keys(arabic).sort()).toEqual(['few', 'many', 'one', 'other', 'two', 'zero']);
    }
  });

  it('English plurals have one and other', () => {
    for (const key of keys) {
      const message = en[key] as Message;
      if (typeof message === 'object') expect(Object.keys(message).sort()).toEqual(['one', 'other']);
    }
  });
});
