import type { Changes } from '../changes.js';
import type { Renderer } from './types.js';

/**
 * Render a run as a single JSON object keyed by lockfile (Shape 1):
 *   `{ "<lockfile>": { "<package>": Change, … }, … }`.
 * One valid, `jq`-friendly document for the whole run — fixes the prior bug
 * where multiple lockfiles produced glued, unparseable `{…}{…}` output.
 */
export const jsonRenderer: Renderer = {
  render(lockfiles) {
    const grouped: Record<string, Changes> = {};
    for (const { lockfile, changes } of lockfiles) grouped[lockfile] = changes;
    return JSON.stringify(grouped, null, 2);
  },
};
