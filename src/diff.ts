import semver from 'semver';
import type { NormalizedLockfile } from './formats/types.js';

/** Re-export the canonical lockfile type for library consumers. */
export type { NormalizedLockfile } from './formats/types.js';

/** Map of package key -> [oldVersion, newVersion]. `null` means added/removed. */
export type Changes = Record<string, [string | null, string | null]>;

/**
 * Reduce a lockfile's packages to a `key -> version` map, applying the shallow
 * (direct-dependencies-only) filter when requested.
 */
function packageVersions(lock: NormalizedLockfile, shallow: boolean): Map<string, string> {
  const allow = shallow && lock.directDependencyKeys ? new Set(lock.directDependencyKeys) : null;
  return new Map(
    Object.entries(lock.packages)
      .filter(([name]) => allow === null || allow.has(name))
      .map(([name, { version }]) => [name, version]),
  );
}

/**
 * Compute the version changes between two normalized lockfiles.
 *
 * Returns a map of package key -> [oldVersion, newVersion]. A `null` oldVersion
 * means the package was added; a `null` newVersion means it was removed.
 * Unchanged packages are omitted.
 *
 * When `shallow` is true, only packages whose key appears in the lockfile's
 * `directDependencyKeys` are considered.
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
    .map((key): [string, [string | null, string | null]] => {
      const oldVersion = oldVersions.get(key) ?? null;
      const newVersion = newVersions.get(key) ?? null;
      return [key, [oldVersion, newVersion]];
    })
    // Drop unchanged packages (present in both, same version).
    .filter(([, [oldVersion, newVersion]]) => {
      return !(oldVersion !== null && newVersion !== null && semver.eq(oldVersion, newVersion));
    });

  return Object.fromEntries(entries);
}
