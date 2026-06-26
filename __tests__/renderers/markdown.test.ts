import { markdownRenderer } from '../../src/renderers/markdown.js';
import { changes } from '../helpers.js';
import type { RenderOptions } from '../../src/renderers/types.js';

const opts: RenderOptions = { color: false, title: '' };

describe('markdownRenderer', () => {
  it('renders a markdown table with a Change column', () => {
    const out = markdownRenderer.render(
      changes({
        express: ['4.18.0', '4.18.2'], // upgrade
        lodash: [null, '4.17.21'], // added
        chalk: ['4.1.0', null], // removed
      }),
      opts,
    );
    const lines = out.split('\n');
    // header (markdown-table pads columns, so match a prefix not exact equality)
    expect(lines[0]).toContain('| Package |');
    expect(out).toContain('express');
    expect(out).toContain('4.18.0 → **4.18.2**'); // upgrade bolds new
    expect(out).toContain('**4.17.21** (added)');
    expect(out).toContain('~~4.1.0~~ (removed)');
  });

  it('renders an H2 title line when a title is given', () => {
    const out = markdownRenderer.render(changes({}), { color: false, title: 'bun.lock' });
    expect(out.split('\n')[0]).toBe('## bun.lock');
  });

  it('renders only the header row for empty changes', () => {
    const out = markdownRenderer.render(changes({}), opts);
    expect(out.split('\n')).toHaveLength(2); // header + separator
  });
});
