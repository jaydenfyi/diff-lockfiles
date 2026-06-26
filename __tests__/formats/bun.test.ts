import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { parseBunLockfile } from '../../src/formats/bun.js';

const here = dirname(fileURLToPath(import.meta.url));
const fixture = readFileSync(join(here, 'fixtures/bun.lock.jsonc'), 'utf8');

describe('parseBunLockfile', () => {
  const lock = parseBunLockfile.parse('bun.lock', fixture);

  it('matches "bun.lock"', () => {
    expect(parseBunLockfile.matches('bun.lock')).toBe(true);
    expect(parseBunLockfile.matches('package-lock.json')).toBe(false);
  });

  it('extracts the version from the "name@version" array element', () => {
    expect(lock.packages['express']).toEqual({ version: '4.18.2' });
    expect(lock.packages['accepts']).toEqual({ version: '1.3.8' });
  });

  it('handles scoped names with two "@" characters', () => {
    expect(lock.packages['@types/node']).toEqual({ version: '20.0.0' });
  });

  it('reads direct dependency keys from workspaces[""] for shallow mode', () => {
    expect(lock.directDependencyKeys?.sort()).toEqual(
      ['@types/node', 'express'].sort(),
    );
  });

  it('tolerates JSONC comments and trailing commas', () => {
    // fixture contains both; if parsing succeeded we already pass
    expect(Object.keys(lock.packages)).toHaveLength(3);
  });
});
