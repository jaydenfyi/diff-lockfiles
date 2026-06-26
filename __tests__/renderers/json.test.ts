import { jsonRenderer } from '../../src/renderers/json.js';
import type { Changes } from '../../src/diff.js';
import type { RenderOptions } from '../../src/renderers/types.js';

const opts: RenderOptions = { color: false, title: '' };

describe('jsonRenderer', () => {
  it('serializes changes as compact JSON', () => {
    const changes: Changes = {
      express: ['4.18.0', '4.18.2'],
      lodash: [null, '4.17.21'],
      chalk: ['4.1.0', null],
    };
    expect(jsonRenderer.render(changes, opts)).toBe(JSON.stringify(changes));
  });

  it('renders {} for empty changes', () => {
    expect(jsonRenderer.render({}, opts)).toBe('{}');
  });
});
