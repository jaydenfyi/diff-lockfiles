import type { Renderer } from './types.js';

/** Render changes as a compact JSON object. */
export const jsonRenderer: Renderer = {
  render(changes) {
    return JSON.stringify(changes);
  },
};
