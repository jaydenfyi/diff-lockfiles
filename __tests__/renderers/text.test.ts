import { textRenderer } from '../../src/renderers/text.js';
import { createColors } from '../../src/colors.js';
import type { Changes } from '../../src/diff.js';
import type { RenderOptions } from '../../src/renderers/types.js';

const noColor: RenderOptions = { color: false, title: '' };

describe('textRenderer', () => {
  it('formats added / removed / changed packages, one per line', () => {
    const changes: Changes = {
      lodash: [null, '4.17.21'], // added
      express: ['4.18.0', null], // removed
      chalk: ['4.1.0', '5.0.0'], // changed
    };
    expect(textRenderer.render(changes, noColor)).toBe(
      'lodash added\nexpress removed\nchalk 4.1.0 -> 5.0.0',
    );
  });

  it('returns an empty string for empty changes (print() then emits nothing)', () => {
    expect(textRenderer.render({}, noColor)).toBe('');
  });

  it('omits unchanged entries', () => {
    expect(textRenderer.render({ chalk: ['4.1.0', '4.1.0'] }, noColor)).toBe('');
  });

  it('colorizes when color=true (green for added / upgrade)', () => {
    const out = textRenderer.render({ lodash: [null, '1.0.0'] }, { color: true, title: '' });
    // createColors(true).green emits the same ANSI chalk would; matching it proves
    // colour engaged.
    expect(out).toContain(createColors(true).green('added'));
  });

  it('emits no ANSI codes when color=false', () => {
    const out = textRenderer.render(
      { lodash: [null, '1.0.0'], express: ['4.18.0', null] },
      noColor,
    );
    expect(out).toBe('lodash added\nexpress removed');
    expect(out).not.toContain('\x1b');
  });
});
