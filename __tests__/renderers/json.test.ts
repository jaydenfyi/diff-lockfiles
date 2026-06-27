import { jsonRenderer } from '../../src/renderers/json.js';
import { changes } from '../helpers.js';
import type { RenderOptions } from '../../src/renderers/types.js';

const opts: RenderOptions = { color: false, title: '' };

describe('jsonRenderer', () => {
  it('serializes each change as a full structured object', () => {
    const out = jsonRenderer.render(
      changes({
        express: ['4.18.0', '4.18.2'],
        lodash: [null, '4.17.21'],
        chalk: ['4.1.0', null],
      }),
      opts,
    );
    const parsed = JSON.parse(out);
    expect(parsed.express).toEqual({
      kind: 'upgrade',
      oldVersion: { scheme: 'semver', raw: '4.18.0', major: 4, minor: 18, patch: 0 },
      newVersion: { scheme: 'semver', raw: '4.18.2', major: 4, minor: 18, patch: 2 },
      bump: 'patch',
      scope: 'transitive',
    });
    expect(parsed.lodash.kind).toBe('added');
    expect(parsed.lodash.newVersion.raw).toBe('4.17.21');
    expect(parsed.chalk.kind).toBe('removed');
    expect(parsed.chalk.oldVersion.raw).toBe('4.1.0');
  });

  it('pretty-prints with 2-space indentation', () => {
    const out = jsonRenderer.render(changes({ express: ['4.18.0', '4.18.2'] }), opts);
    expect(out).toContain('\n    "kind": "upgrade"');
  });

  it('renders {} for empty changes', () => {
    expect(jsonRenderer.render(changes({}), opts)).toBe('{}');
  });
});
