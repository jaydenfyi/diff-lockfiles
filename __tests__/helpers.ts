import { bumpOf, classify, parseVersion } from '../src/changes.js';
import type { Change, Changes, Scope, Version } from '../src/changes.js';
import type { NormalizedPackage } from '../src/formats/types.js';
import type { LockfileDiffs } from '../src/renderers/types.js';

/** Build a {@link NormalizedPackage} for inline lockfile fixtures in tests. */
export function pkg(
  name: string,
  version: string,
  sourceKey: string = `${name}@${version}`,
  direct = false,
): NormalizedPackage {
  return { name, version, sourceKey, direct };
}

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

/**
 * Build a {@link LockfileDiffs} array from `lockfile -> { name -> [old, new] }`,
 * so multi-lockfile renderer tests stay readable while constructing real data.
 */
export function lockfiles(
  entries: Record<string, Record<string, [string | null, string | null]>>,
): LockfileDiffs {
  return Object.entries(entries).map(([lockfile, changesMap]) => ({
    lockfile,
    changes: changes(changesMap),
  }));
}
