import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { parseNpmLockfile } from '../../src/formats/npm.js';

const here = dirname(fileURLToPath(import.meta.url));
const fixture = readFileSync(join(here, 'fixtures/package-lock.v3.json'), 'utf8');

describe('parseNpmLockfile', () => {
  const lock = parseNpmLockfile.parse('package-lock.json', fixture);

  it('matches "package-lock.json"', () => {
    expect(parseNpmLockfile.matches('package-lock.json')).toBe(true);
    expect(parseNpmLockfile.matches('bun.lock')).toBe(false);
  });

  it('passes the packages map through unchanged', () => {
    expect(lock.packages['node_modules/express']).toEqual({ version: '4.18.2' });
    expect(lock.packages['node_modules/@types/node']).toEqual({ version: '20.0.0' });
  });

  it('builds shallow-mode direct dependency keys as node_modules/ paths', () => {
    expect(lock.directDependencyKeys?.sort()).toEqual(
      ['', 'node_modules/@types/node', 'node_modules/express'].sort(),
    );
  });
});
