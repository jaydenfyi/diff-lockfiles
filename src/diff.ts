import semver from 'semver';
import type { NormalizedLockfile } from './formats/types.js';

/** Re-export the canonical lockfile type for library consumers. */
export type { NormalizedLockfile } from './formats/types.js';

/** Map of package key -> [oldVersion, newVersion]. `null` means added/removed. */
export type Changes = Record<string, [string | null, string | null]>;

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
  const changes: Changes = {};

  function filterPackages(lock: NormalizedLockfile): [string, { version: string }][] {
    let entries = Object.entries(lock.packages);
    if (shallow && lock.directDependencyKeys) {
      const allow = new Set(lock.directDependencyKeys);
      entries = entries.filter(([name]) => allow.has(name));
    }
    return entries;
  }

  filterPackages(oldLock).forEach(([name, { version }]) => {
    changes[name] = [version, null];
  });

  filterPackages(newLock).forEach(([name, { version }]) => {
    if (changes[name] && changes[name][0]) {
      if (semver.eq(changes[name][0] as string, version)) {
        delete changes[name];
      } else {
        changes[name] = [changes[name][0], version];
      }
    } else {
      changes[name] = [null, version];
    }
  });

  return changes;
}
