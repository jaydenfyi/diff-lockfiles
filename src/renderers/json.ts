import type { Change } from '../changes.js';
import type { Renderer } from './types.js';

/**
 * Render a run as a single JSON object keyed by lockfile, then by bare package
 * name, with each value an array of {@link Change}: `{ "<lockfile>": { "<pkg>": Change[] } }`.
 *
 * Values are arrays (not single objects) so multiple resolved-version changes
 * for one package name are never lost. Most names have exactly one entry. The
 * internal model stays `Change[]` (flat); only this wire format groups by name.
 * One valid, `jq`-friendly document per run.
 */
export const jsonRenderer: Renderer = {
  render(lockfiles) {
    const grouped: Record<string, Record<string, Change[]>> = {};
    for (const { lockfile, changes } of lockfiles) {
      const byName: Record<string, Change[]> = {};
      for (const change of changes) {
        const list = byName[change.name];
        if (list) list.push(change);
        else byName[change.name] = [change];
      }
      grouped[lockfile] = byName;
    }
    return JSON.stringify(grouped, null, 2);
  },
};
