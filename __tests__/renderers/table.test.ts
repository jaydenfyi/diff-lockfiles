import { tableRenderer } from '../../src/renderers/table.js';
import { lockfiles } from '../helpers.js';
import type { RenderOptions } from '../../src/renderers/types.js';

const noColor: RenderOptions = { color: false };

describe('tableRenderer', () => {
  it('renders one boxed table per lockfile, each titled by its filename', () => {
    const out = tableRenderer.render(
      lockfiles({
        'apps/api/bun.lock': { express: ['4.18.0', '4.19.0'] },
        'package-lock.json': { lodash: [null, '4.17.21'] },
      }),
      noColor,
    );
    expect(out).toContain('apps/api/bun.lock');
    expect(out).toContain('package-lock.json');
    // The two tables are separated by a blank line.
    expect(out).toMatch(/apps\/api\/bun\.lock[\s\S]*\n\n[\s\S]*package-lock\.json/);
  });

  it('renders a header row plus one row per change (single lockfile)', () => {
    const out = tableRenderer.render(lockfiles({ 'package-lock.json': { lodash: ['4.17.20', '4.17.21'] } }), noColor);
    expect(out).toContain('package');
    expect(out).toContain('old');
    expect(out).toContain('lodash');
  });

  it('emits an empty string for an empty run', () => {
    expect(tableRenderer.render([], noColor)).toBe('');
  });
});
