import type { NormalizedLockfile } from './formats/types.js';
import { bumpOf, classify, isUnchanged, parseVersion } from './changes.js';
import type { Change, Changes, Scope, Version } from './changes.js';

/** Re-export the canonical lockfile type for library consumers. */
export type { NormalizedLockfile } from './formats/types.js';

/**
 * Reduce a lockfile's packages to a `key -> Version` map, applying the shallow
 * (direct-dependencies-only) filter when requested.
 */
function packageVersions(lock: NormalizedLockfile, shallow: boolean): Map<string, Version> {
  const allow = shallow && lock.directDependencyKeys ? new Set(lock.directDependencyKeys) : null;
  return new Map(
    Object.entries(lock.packages)
      .filter(([name]) => allow === null || allow.has(name))
      .map(([name, { version }]) => [name, parseVersion(version)]),
  );
}

/**
 * Compute the version changes between two normalized lockfiles.
 *
 * Returns a map of package key -> {@link Change}, where each change is
 * pre-classified (`added`/`removed`/`upgrade`/`downgrade`/`changed`) and carries
 * its semver magnitude (`bump`) and dependency depth (`scope`). Unchanged
 * packages are dropped. When `shallow` is true, only packages whose key appears
 * in the lockfile's `directDependencyKeys` are considered.
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

  // A key is "direct" if it appears as a direct dependency on either side.
  const directKeys = new Set<string>([
    ...(oldLock.directDependencyKeys ?? []),
    ...(newLock.directDependencyKeys ?? []),
  ]);

  const entries = [...allKeys]
    .map((key): [string, Change] => {
      const oldVersion = oldVersions.get(key) ?? null;
      const newVersion = newVersions.get(key) ?? null;
      const scope: Scope = directKeys.has(key) ? 'direct' : 'transitive';
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
