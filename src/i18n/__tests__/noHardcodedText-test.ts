import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const SRC = join(__dirname, '..', '..');

function screenFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === '__tests__' ? [] : screenFiles(path);
    return name.endsWith('.tsx') ? [path] : [];
  });
}

/** Text a user would see or hear, written straight into a component instead of going through `t()`. */
const PATTERNS: [string, RegExp][] = [
  ['JSX text', />\s*([^<>{}]*[A-Za-z][^<>{}]*?)\s*<\/[A-Za-z.]+>/],

  ['alert', /Alert\.alert\(\s*["'`]/],
  ['announcement', /announceForAccessibility\(\s*["'`]/],
];

const TEXT_PROP = /\b(label|title|placeholder|caption|message|accessibilityLabel|accessibilityHint)=\{?\s*(["'`])([^"'`]*)\2/g;

describe('every user-facing string goes through the translation catalog', () => {
  it.each(screenFiles(SRC).map((path) => [relative(SRC, path), path]))('%s', (_name, path) => {
    const code = readFileSync(path, 'utf8');
    for (const [kind, pattern] of PATTERNS) {
      const match = code.match(pattern);
      expect(match ? `${kind}: ${match[0].trim()}` : null).toBeNull();
    }
    // Text props given a literal with words in it (`${...}` code inside template literals doesn't count)
    for (const [, prop, , value] of code.matchAll(TEXT_PROP)) {
      expect(/[A-Za-z]/.test(value.replace(/\$\{[^}]*\}/g, '')) ? `text prop ${prop}: ${value}` : null).toBeNull();
    }
  });
});
