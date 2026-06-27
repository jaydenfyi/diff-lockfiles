import type { NormalizedLockfile, NormalizedPackage } from './formats/types.js';
import { bumpOf, classify, isUnchanged, parseVersion } from './changes.js';
import type { Change, Changes, Scope, Version } from './changes.js';

/** Re-export the canonical lockfile type for library consumers. */
export type { NormalizedLockfile } from './formats/types.js';

/**
 * Reduce a lockfile's packages to a `key -> Version` map, applying the shallow
 * (direct-dependencies-only) filter when requested and the format reports that
 * direct-dependency info is available.
 */
function packageVersions(lock: NormalizedLockfile, shallow: boolean): Map<string, Version> {
  return new Map(
    Object.entries(lock.packages)
      .filter(([, pkg]) => pkg.name !== '') // skip the npm root "" project entry
      .filter(([, pkg]) => !shallow || !lock.directDependencyInfoAvailable || pkg.direct)
      .map(([key, { version }]) => [key, parseVersion(version)]),
  );
}

/**
 * Compute the version changes between two normalized lockfiles.
 *
 * Returns a map of package key -> {@link Change}, where each change is
 * pre-classified (`added`/`removed`/`upgrade`/`downgrade`/`changed`) and carries
 * its semver magnitude (`bump`) and dependency depth (`scope`). Unchanged
 * packages are dropped. When `shallow` is true, only direct dependencies are
 * considered (when the format can identify them).
 *
 * All version reasoning (classification + the unchanged check) lives in
 * `changes.ts`; this function is pure set arithmetic over the two lockfiles.
 */
export function diff(
  oldLock: NormalizedLockfile,
  newLock: NormalizedLockfile,
  shallow: boolean,
): Changes {
  const oldVersions = packageVersions(oldLock, shallow);
  const newVersions = packageVersions(newLock, shallow);

  // Union of keys, old-order first then newly-added (newLock order) — matches the
  // historical output ordering.
  const allKeys = new Set([...oldVersions.keys(), ...newVersions.keys()]);

  const entries = [...allKeys]
    .map((key): [string, Change] => {
      const oldVersion = oldVersions.get(key) ?? null;
      const newVersion = newVersions.get(key) ?? null;
      const scope: Scope = scopeOf(oldLock.packages[key], newLock.packages[key]);
      return [
        key,
        {
          kind: classify(oldVersion, newVersion),
          oldVersion,
          newVersion,
          bump: bumpOf(oldVersion, newVersion),
          scope,
        },
      ];
    })
    // Drop unchanged packages (present in both, same version).
    .filter(([, change]) => !isUnchanged(change.oldVersion, change.newVersion));

  return Object.fromEntries(entries);
}

/** A paired change is `direct` if either side was a direct dependency. */
function scopeOf(oldPkg: NormalizedPackage | undefined, newPkg: NormalizedPackage | undefined): Scope {
  return oldPkg?.direct || newPkg?.direct ? 'direct' : 'transitive';
}
