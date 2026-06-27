import { bumpOf, classify, parseVersion } from '../src/changes.js';
import type { Change, Changes, Scope, Version } from '../src/changes.js';

/** Build a single classified {@link Change} from raw version strings. */
export function change(
  oldVersion: string | null,
  newVersion: string | null,
  scope: Scope = 'transitive',
): Change {
  const oldV: Version | null = oldVersion === null ? null : parseVersion(oldVersion);
  const newV: Version | null = newVersion === null ? null : parseVersion(newVersion);
  return {
    kind: classify(oldV, newV),
    oldVersion: oldV,
    newVersion: newV,
    bump: bumpOf(oldV, newV),
    scope,
  };
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
