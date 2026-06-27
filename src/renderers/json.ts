import type { Renderer } from './types.js';

/**
 * Render changes as a pretty-printed JSON object. Each package maps to its full
 * {@link Change} (`kind`, structured `oldVersion`/`newVersion`, `bump`, `scope`),
 * so consumers get the classified data directly rather than raw version tuples.
 */
export const jsonRenderer: Renderer = {
  render(changes) {
    return JSON.stringify(changes, null, 2);
  },
};
