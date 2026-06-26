import { jsonRenderer } from '../../src/renderers/json.js';
import { changes } from '../helpers.js';
import type { RenderOptions } from '../../src/renderers/types.js';

const opts: RenderOptions = { color: false, title: '' };

describe('jsonRenderer', () => {
  it('serializes changes as a compact {name:[old,new]} object', () => {
    const out = jsonRenderer.render(
      changes({
        express: ['4.18.0', '4.18.2'],
        lodash: [null, '4.17.21'],
        chalk: ['4.1.0', null],
      }),
      opts,
    );
    // JSON is a data format: it flattens each Change back to the raw tuple,
    // dropping the presentation `kind`.
    expect(out).toBe(
      JSON.stringify({
        express: ['4.18.0', '4.18.2'],
        lodash: [null, '4.17.21'],
        chalk: ['4.1.0', null],
      }),
    );
  });

  it('renders {} for empty changes', () => {
    expect(jsonRenderer.render(changes({}), opts)).toBe('{}');
  });
});
