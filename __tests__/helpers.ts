import { classify } from '../src/changes.js';
import type { Change, Changes } from '../src/changes.js';

/** Build a single classified {@link Change} from a raw [old, new] tuple. */
export function change(oldVersion: string | null, newVersion: string | null): Change {
  return { kind: classify(oldVersion, newVersion), oldVersion, newVersion };
}

/**
 * Build a {@link Changes} map from `name -> [old, new]` tuples (the pre-B shape),
 * so renderer tests stay readable while constructing real Change objects.
 */
export function changes(entries: Record<string, [string | null, string | null]>): Changes {
  return Object.fromEntries(
    Object.entries(entries).map(([name, [oldVersion, newVersion]]) => [
      name,
      change(oldVersion, newVersion),
    ]),
  );
}
