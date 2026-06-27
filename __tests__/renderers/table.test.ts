import { tableRenderer } from '../../src/renderers/table.js';
import { changes } from '../helpers.js';
import type { RenderOptions } from '../../src/renderers/types.js';

const opts: RenderOptions = { color: false, title: '' };

describe('tableRenderer', () => {
  it('renders a header row plus one row per change', () => {
    const out = tableRenderer.render(
      changes({ express: ['4.18.0', '4.18.2'], lodash: [null, '4.17.21'] }),
      opts,
    );
    // header labels
    expect(out).toContain('package');
    expect(out).toContain('change');
    // change rows
    expect(out).toContain('express');
    expect(out).toContain('4.18.0');
    expect(out).toContain('4.18.2');
    expect(out).toContain('↑ patch'); // upgrade change cell
    expect(out).toContain('lodash');
    expect(out).toContain('added'); // added change cell
  });

  it('prepends a title row when a title is given', () => {
    const out = tableRenderer.render(changes({}), { color: false, title: 'package-lock.json' });
    // the title appears as a row inside the boxed table (not the top border)
    expect(out).toContain('package-lock.json');
  });

  it('still emits a header-only table for empty changes', () => {
    const out = tableRenderer.render(changes({}), opts);
    expect(out).toContain('package');
    expect(out).toMatch(/[═│║]/); // it is a boxed table
  });
});
