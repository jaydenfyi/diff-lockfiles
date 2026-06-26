import type { Renderer } from './types.js';

/** Render changes as a compact JSON object. */
export const jsonRenderer: Renderer = {
  render(changes) {
    // Flatten each Change back to its [oldVersion, newVersion] tuple: JSON is a
    // data format, so it carries the raw versions rather than the presentation
    // `kind` (consumers can classify from the data themselves).
    const tuples = Object.fromEntries(
      Object.entries(changes).map(([name, { oldVersion, newVersion }]) => [
        name,
        [oldVersion, newVersion],
      ]),
    );
    return JSON.stringify(tuples);
  },
};
