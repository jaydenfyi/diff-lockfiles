import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { parsePnpmLockfile } from '../../src/formats/pnpm.js';

const here = dirname(fileURLToPath(import.meta.url));
const fixture = readFileSync(join(here, 'fixtures/pnpm-lock.v9.yaml'), 'utf8');

describe('parsePnpmLockfile', () => {
  const lock = parsePnpmLockfile.parse('pnpm-lock.yaml', fixture);

  it('matches "pnpm-lock.yaml" at any depth, rejects other formats', () => {
    expect(parsePnpmLockfile.matches('pnpm-lock.yaml')).toBe(true);
    expect(parsePnpmLockfile.matches('apps/web/pnpm-lock.yaml')).toBe(true);
    expect(parsePnpmLockfile.matches('aube-lock.yaml')).toBe(false);
    expect(parsePnpmLockfile.matches('package-lock.json')).toBe(false);
    expect(parsePnpmLockfile.matches('yarn.lock')).toBe(false);
  });

  it('extracts the version from the "name@version" key (no version field)', () => {
    expect(lock.packages['is-even@1.0.0']).toEqual({ version: '1.0.0' });
    expect(lock.packages['is-odd@3.0.1']).toEqual({ version: '3.0.1' });
    expect(lock.packages['is-number@3.0.0']).toEqual({ version: '3.0.0' });
  });

  it('keeps multiple versions of the same package as distinct keys', () => {
    expect(lock.packages['is-number@3.0.0']).toBeDefined();
    expect(lock.packages['is-number@6.0.0']).toBeDefined();
    expect(lock.packages['is-odd@0.1.2']).toBeDefined();
    expect(lock.packages['is-odd@3.0.1']).toBeDefined();
  });

  it('reads direct dependency keys from importers["."]', () => {
    expect(lock.directDependencyKeys).toBeDefined();
    expect(lock.directDependencyKeys?.sort()).toEqual(['is-even@1.0.0', 'is-odd@3.0.1']);
  });

  it('parses every package entry in packages:', () => {
    expect(Object.keys(lock.packages)).toHaveLength(7);
  });

  it('returns an empty packages map for unparseable input', () => {
    expect(parsePnpmLockfile.parse('pnpm-lock.yaml', '')).toEqual({ packages: {} });
    expect(parsePnpmLockfile.parse('pnpm-lock.yaml', 'not: valid: yaml: :')).toEqual({ packages: {} });
  });
});
