import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const SRC = join(__dirname, '..', '..');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === '__tests__' ? [] : sourceFiles(path);
    return /\.tsx?$/.test(name) ? [path] : [];
  });
}

// Everything outside the theme must use its tokens (PHASES-2, Phase 3)
const files = sourceFiles(SRC).filter((path) => !relative(SRC, path).startsWith('theme'));

describe('design tokens only', () => {
  it.each(files.map((path) => [relative(SRC, path), path]))('%s has no hard-coded colors or font sizes', (_name, path) => {
    const code = readFileSync(path, 'utf8');
    expect(code).not.toMatch(/['"]#[0-9a-fA-F]{3,8}['"]/);
    expect(code).not.toMatch(/\brgba?\(/);
    expect(code).not.toMatch(/fontSize:\s*\d/);
  });
});
