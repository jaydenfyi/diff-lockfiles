import { textRenderer } from '../../src/renderers/text.js';
import { createColor } from '../../src/colors.js';
import { changes } from '../helpers.js';
import type { RenderOptions } from '../../src/renderers/types.js';

const noColor: RenderOptions = { color: false, title: '' };

describe('textRenderer', () => {
  it('formats added / removed / upgrade packages, one per line', () => {
    const out = textRenderer.render(
      changes({
        lodash: [null, '4.17.21'], // added
        express: ['4.18.0', null], // removed
        chalk: ['4.1.0', '5.0.0'], // upgrade
      }),
      noColor,
    );
    expect(out).toBe(
      'lodash added 4.17.21 · transitive\nexpress removed 4.18.0 · transitive\nchalk 4.1.0 -> 5.0.0 major · transitive',
    );
  });

  it('returns an empty string for empty changes (print() then emits nothing)', () => {
    expect(textRenderer.render(changes({}), noColor)).toBe('');
  });

  it('renders a non-semver change plainly with no colour (and no throw)', () => {
    // diff() drops truly-unchanged entries, so a renderer only ever sees real
    // changes; a non-semver specifier is a `changed` kind and renders plain.
    const out = textRenderer.render(changes({ foo: ['git+ssh://host/a', 'git+ssh://host/b'] }), noColor);
    expect(out).toBe('foo git+ssh://host/a -> git+ssh://host/b · transitive');
  });

  it('paints upgrade green and downgrade red when colour is enabled', () => {
    const out = textRenderer.render(
      changes({ up: ['1.0.0', '2.0.0'], down: ['2.0.0', '1.0.0'] }),
      { color: true, title: '' },
    );
    const color = createColor(true);
    expect(out).toContain(color.green(`${color.bold('1.0.0')} -> ${color.bold('2.0.0')} major`));
    expect(out).toContain(color.red(`${color.bold('2.0.0')} -> ${color.bold('1.0.0')} major`));
  });

  it('emits no ANSI codes when color=false', () => {
    const out = textRenderer.render(
      changes({ lodash: [null, '1.0.0'], express: ['4.18.0', null] }),
      noColor,
    );
    expect(out).toBe('lodash added 1.0.0 · transitive\nexpress removed 4.18.0 · transitive');
    expect(out).not.toContain('\x1b');
  });
});
