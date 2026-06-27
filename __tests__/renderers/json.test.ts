import { jsonRenderer } from '../../src/renderers/json.js';
import { changeEntry, lockfiles } from '../helpers.js';
import type { LockfileDiffs, RenderOptions } from '../../src/renderers/types.js';

const options: RenderOptions = { color: false };

describe('jsonRenderer', () => {
  it('groups changes under each lockfile key, then by bare package name (array values)', () => {
    const out = jsonRenderer.render(
      lockfiles({
        'apps/api/bun.lock': { express: ['4.18.0', '4.18.2'] },
        'package-lock.json': { lodash: [null, '4.17.21'] },
      }),
      options,
    );
    const parsed = JSON.parse(out); // MUST parse: one valid document, not glued objects
    expect(Object.keys(parsed)).toEqual(['apps/api/bun.lock', 'package-lock.json']);
    expect(parsed['apps/api/bun.lock'].express[0].kind).toBe('upgrade');
    expect(parsed['package-lock.json'].lodash[0].kind).toBe('added');
  });

  it('keys packages by bare name (not node_modules path)', () => {
    const out = jsonRenderer.render(
      lockfiles({ 'package-lock.json': { lodash: [null, '4.17.21'] } }),
      options,
    );
    const parsed = JSON.parse(out);
    expect(parsed['package-lock.json'].lodash).toBeDefined();
    expect(parsed['package-lock.json']['node_modules/lodash']).toBeUndefined();
  });

  it('serializes each change as a full structured object with name + source keys', () => {
    const out = jsonRenderer.render(
      lockfiles({ 'package-lock.json': { express: ['4.18.0', '4.18.2'] } }),
      options,
    );
    expect(JSON.parse(out)['package-lock.json'].express).toEqual([
      {
        name: 'express',
        oldSourceKey: 'express@4.18.0',
        newSourceKey: 'express@4.18.2',
        kind: 'upgrade',
        oldVersion: { scheme: 'semver', raw: '4.18.0', major: 4, minor: 18, patch: 0 },
        newVersion: { scheme: 'semver', raw: '4.18.2', major: 4, minor: 18, patch: 2 },
        bump: 'patch',
        scope: 'transitive',
      },
    ]);
  });

  it('keeps duplicate same-name changes as multiple array entries', () => {
    const data: LockfileDiffs = [
      {
        lockfile: 'pnpm-lock.yaml',
        changes: [
          changeEntry('left-pad', '1.1.3', null),
          changeEntry('left-pad', '1.2.0', null),
        ],
      },
    ];
    const parsed = JSON.parse(jsonRenderer.render(data, options));
    // Both changes group under the bare name `left-pad` as a 2-entry array.
    expect(parsed['pnpm-lock.yaml']['left-pad']).toHaveLength(2);
    expect(parsed['pnpm-lock.yaml']['left-pad'].map((change: { kind: string }) => change.kind)).toEqual([
      'removed',
      'removed',
    ]);
  });

  it('pretty-prints with 2-space indentation', () => {
    const out = jsonRenderer.render(
      lockfiles({ 'package-lock.json': { express: ['4.18.0', '4.18.2'] } }),
      options,
    );
    expect(out).toContain('\n        "kind": "upgrade"');
  });

  it('renders {} for an empty run', () => {
    expect(jsonRenderer.render([], options)).toBe('{}');
  });

  it('preserves source keys on each duplicate entry (not folded away)', () => {
    const data: LockfileDiffs = [
      {
        lockfile: 'package-lock.json',
        changes: [
          changeEntry('lodash', '4.17.21', null, { oldSourceKey: 'node_modules/foo/node_modules/lodash' }),
          changeEntry('lodash', '4.17.21', null, { oldSourceKey: 'node_modules/bar/node_modules/lodash' }),
        ],
      },
    ];
    const parsed = JSON.parse(jsonRenderer.render(data, options));
    expect(parsed['package-lock.json'].lodash).toHaveLength(2);
    expect(parsed['package-lock.json'].lodash[0].oldSourceKey).toBe(
      'node_modules/foo/node_modules/lodash',
    );
    expect(parsed['package-lock.json'].lodash[1].oldSourceKey).toBe(
      'node_modules/bar/node_modules/lodash',
    );
  });
});
