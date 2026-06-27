import { textRenderer } from '../../src/renderers/text.js';
import { createColor } from '../../src/colors.js';
import { lockfiles } from '../helpers.js';
import type { RenderOptions } from '../../src/renderers/types.js';

const noColor: RenderOptions = { color: false };

describe('textRenderer', () => {
  it('renders a header divider per lockfile, then one line per change', () => {
    const out = textRenderer.render(
      lockfiles({
        'apps/api/bun.lock': { lodash: [null, '4.17.21'] }, // added
        'package-lock.json': { chalk: ['4.1.0', '5.0.0'] }, // upgrade
      }),
      noColor,
    );
    expect(out).toBe(
      [
        '── apps/api/bun.lock ──',
        'lodash added 4.17.21 · transitive',
        '',
        '── package-lock.json ──',
        'chalk 4.1.0 -> 5.0.0 major · transitive',
      ].join('\n'),
    );
  });

  it('returns an empty string for an empty run', () => {
    expect(textRenderer.render([], noColor)).toBe('');
  });

  it('renders a non-semver change plainly with no colour (and no throw)', () => {
    const out = textRenderer.render(lockfiles({ 'a.lock': { foo: ['git+ssh://host/a', 'git+ssh://host/b'] } }), noColor);
    expect(out).toBe('── a.lock ──\nfoo git+ssh://host/a -> git+ssh://host/b · transitive');
  });

  it('paints upgrades green / downgrades red when colour is enabled', () => {
    const out = textRenderer.render(lockfiles({ 'a.lock': { up: ['1.0.0', '2.0.0'], down: ['2.0.0', '1.0.0'] } }), { color: true });
    const color = createColor(true);
    expect(out).toContain(color.green(`${color.bold('1.0.0')} -> ${color.bold('2.0.0')} major`));
    expect(out).toContain(color.red(`${color.bold('2.0.0')} -> ${color.bold('1.0.0')} major`));
  });

  it('emits no ANSI codes when color=false', () => {
    const out = textRenderer.render(lockfiles({ 'a.lock': { lodash: [null, '1.0.0'] } }), noColor);
    expect(out).not.toContain('\x1b');
  });
});
