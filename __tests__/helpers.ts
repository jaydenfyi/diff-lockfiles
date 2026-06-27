import { bumpOf, classify, parseVersion } from '../src/changes.js';
import type { Change, Scope, Version } from '../src/changes.js';
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

/** Build a single classified {@link Change} from raw version strings (array model). */
export function change(
  oldVersion: string | null,
  newVersion: string | null,
  scope: Scope = 'transitive',
): Change {
  return changeEntry('pkg', oldVersion, newVersion, { scope });
}

/**
 * Build a {@link Change} carrying bare name + provenance source keys. The
 * default source keys are `name@version`; pass `oldSourceKey`/`newSourceKey`
 * for provenance/disambiguation tests.
 */
export function changeEntry(
  name: string,
  oldVersion: string | null,
  newVersion: string | null,
  options: {
    oldSourceKey?: string | null;
    newSourceKey?: string | null;
    direct?: boolean;
    scope?: Scope;
  } = {},
): Change {
  const oldV: Version | null = oldVersion === null ? null : parseVersion(oldVersion);
  const newV: Version | null = newVersion === null ? null : parseVersion(newVersion);
  return {
    name,
    oldSourceKey: options.oldSourceKey ?? (oldVersion === null ? null : `${name}@${oldVersion}`),
    newSourceKey: options.newSourceKey ?? (newVersion === null ? null : `${name}@${newVersion}`),
    kind: classify(oldV, newV),
    oldVersion: oldV,
    newVersion: newV,
    bump: bumpOf(oldV, newV),
    scope: options.scope ?? (options.direct ? 'direct' : 'transitive'),
  };
}

/**
 * Build a flat {@link Change} array from `name -> [old, new]` tuples, so
 * renderer tests stay readable while constructing real Change objects.
 */
export function changes(
  entries: Record<string, [string | null, string | null]>,
): Change[] {
  return Object.entries(entries).map(([name, [oldVersion, newVersion]]) =>
    changeEntry(name, oldVersion, newVersion),
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
