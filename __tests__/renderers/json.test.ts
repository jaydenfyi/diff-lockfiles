import { jsonRenderer } from '../../src/renderers/json.js';
import { lockfiles } from '../helpers.js';
import type { RenderOptions } from '../../src/renderers/types.js';

const opts: RenderOptions = { color: false };

describe('jsonRenderer', () => {
  it('groups changes under each lockfile key (Shape 1)', () => {
    const out = jsonRenderer.render(
      lockfiles({
        'apps/api/bun.lock': { express: ['4.18.0', '4.18.2'] },
        'package-lock.json': { lodash: [null, '4.17.21'] },
      }),
      opts,
    );
    const parsed = JSON.parse(out); // MUST parse: one valid document, not glued objects
    expect(Object.keys(parsed)).toEqual(['apps/api/bun.lock', 'package-lock.json']);
    expect(parsed['apps/api/bun.lock'].express.kind).toBe('upgrade');
    expect(parsed['package-lock.json'].lodash.kind).toBe('added');
  });

  it('serializes each change as a full structured object', () => {
    const out = jsonRenderer.render(lockfiles({ 'package-lock.json': { express: ['4.18.0', '4.18.2'] } }), opts);
    expect(JSON.parse(out)['package-lock.json'].express).toEqual({
      kind: 'upgrade',
      oldVersion: { scheme: 'semver', raw: '4.18.0', major: 4, minor: 18, patch: 0 },
      newVersion: { scheme: 'semver', raw: '4.18.2', major: 4, minor: 18, patch: 2 },
      bump: 'patch',
      scope: 'transitive',
    });
  });

  it('pretty-prints with 2-space indentation', () => {
    const out = jsonRenderer.render(lockfiles({ 'package-lock.json': { express: ['4.18.0', '4.18.2'] } }), opts);
    expect(out).toContain('\n      "kind": "upgrade"');
  });

  it('renders {} for an empty run', () => {
    expect(jsonRenderer.render([], opts)).toBe('{}');
  });
});
