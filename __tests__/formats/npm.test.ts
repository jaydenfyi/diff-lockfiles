import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { parseNpmLockfile } from '../../src/formats/npm.js';
import { packageNameFromNodeModulesPath } from '../../src/formats/types.js';

describe('packageNameFromNodeModulesPath', () => {
  it('returns the last segment after node_modules/', () => {
    expect(packageNameFromNodeModulesPath('node_modules/express')).toBe('express');
  });

  it('keeps a scoped name together', () => {
    expect(packageNameFromNodeModulesPath('node_modules/@scope/pkg')).toBe('@scope/pkg');
  });

  it('handles nested node_modules', () => {
    expect(packageNameFromNodeModulesPath('node_modules/foo/node_modules/bar')).toBe('bar');
    expect(packageNameFromNodeModulesPath('node_modules/foo/node_modules/@scope/pkg')).toBe('@scope/pkg');
  });

  it('returns an empty string for the root entry', () => {
    expect(packageNameFromNodeModulesPath('')).toBe('');
  });
});


const here = dirname(fileURLToPath(import.meta.url));
const fixture = readFileSync(join(here, 'fixtures/package-lock.v3.json'), 'utf8');

describe('parseNpmLockfile', () => {
  const lock = parseNpmLockfile.parse('package-lock.json', fixture);

  it('matches "package-lock.json"', () => {
    expect(parseNpmLockfile.matches('package-lock.json')).toBe(true);
    expect(parseNpmLockfile.matches('bun.lock')).toBe(false);
  });

  it('normalizes each package with bare name, version, source key, and directness', () => {
    expect(lock.packages['node_modules/express']).toEqual({
      name: 'express',
      version: '4.18.2',
      sourceKey: 'node_modules/express',
      direct: true,
    });
    expect(lock.packages['node_modules/@types/node']).toEqual({
      name: '@types/node',
      version: '20.0.0',
      sourceKey: 'node_modules/@types/node',
      direct: true,
    });
    expect(lock.packages['node_modules/accepts']).toEqual({
      name: 'accepts',
      version: '1.3.8',
      sourceKey: 'node_modules/accepts',
      direct: false,
    });
  });

  it('derives bare names from nested node_modules paths', () => {
    const nested = parseNpmLockfile.parse('package-lock.json', JSON.stringify({
      packages: {
        '': { dependencies: { foo: '^1.0.0' } },
        'node_modules/foo': { version: '1.0.0' },
        'node_modules/foo/node_modules/@scope/pkg': { version: '2.0.0' },
      },
    }));
    expect(nested.packages['node_modules/foo/node_modules/@scope/pkg']).toEqual({
      name: '@scope/pkg',
      version: '2.0.0',
      sourceKey: 'node_modules/foo/node_modules/@scope/pkg',
      direct: false,
    });
  });

  it('flags packages as available for shallow filtering when a root entry exists', () => {
    expect(lock.directDependencyInfoAvailable).toBe(true);
  });
});
