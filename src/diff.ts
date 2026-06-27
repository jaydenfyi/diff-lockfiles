import type { NormalizedLockfile, NormalizedPackage } from './formats/types.js';
import { bumpOf, classify, isUnchanged, parseVersion } from './changes.js';
import type { Change, Changes, Scope, Version } from './changes.js';

/** Re-export the canonical lockfile type for library consumers. */
export type { NormalizedLockfile } from './formats/types.js';

/**
 * The packages a diff should consider, applying the shallow (direct-only)
 * filter when requested and the format reports that direct-dependency info is
 * available. The npm root `''` project entry (empty name) is skipped — it is
 * the project manifest, not a dependency.
 */
function packagesFor(lock: NormalizedLockfile, shallow: boolean): NormalizedPackage[] {
  const packages = Object.values(lock.packages).filter((pkg) => pkg.name !== '');
  if (!shallow || !lock.directDependencyInfoAvailable) return packages;
  return packages.filter((pkg) => pkg.direct);
}

/** Group packages by bare name, preserving first-seen order within each name. */
function groupByName(packages: NormalizedPackage[]): Map<string, NormalizedPackage[]> {
  const grouped = new Map<string, NormalizedPackage[]>();
  for (const pkg of packages) {
    const list = grouped.get(pkg.name);
    if (list) list.push(pkg);
    else grouped.set(pkg.name, [pkg]);
  }
  return grouped;
}

/** A package pre-parsed with its {@link Version}, so cancellation parses once each. */
interface ParsedPackage {
  pkg: NormalizedPackage;
  version: Version;
}

/**
 * Cancel unchanged same-name/same-version entries as a multiset: each old entry
 * is paired with the first remaining new entry that compares equal under the
 * canonical {@link isUnchanged} (semver `eq`, which ignores build metadata), and
 * both are removed. Leftovers are the genuinely changed versions.
 *
 * Reusing `isUnchanged` keeps a single notion of "unchanged" for the whole
 * codebase and preserves the build-metadata-only-change contract end-to-end.
 */
function cancelUnchanged(
  oldPkgs: NormalizedPackage[],
  newPkgs: NormalizedPackage[],
): { oldRemaining: NormalizedPackage[]; newRemaining: NormalizedPackage[] } {
  const oldLeft = oldPkgs.map((pkg) => ({ pkg, version: parseVersion(pkg.version) }));
  const newLeft = newPkgs.map((pkg) => ({ pkg, version: parseVersion(pkg.version) }));

  for (let i = oldLeft.length - 1; i >= 0; i--) {
    const oldEntry: ParsedPackage = oldLeft[i];
    const match = newLeft.findIndex((n) => isUnchanged(oldEntry.version, n.version));
    if (match !== -1) {
      oldLeft.splice(i, 1);
      newLeft.splice(match, 1);
    }
  }
  return {
    oldRemaining: oldLeft.map((e) => e.pkg),
    newRemaining: newLeft.map((e) => e.pkg),
  };
}

/** A paired change is `direct` if either side was a direct dependency. */
function scopeOf(oldPkg: NormalizedPackage | null, newPkg: NormalizedPackage | null): Scope {
  return oldPkg?.direct || newPkg?.direct ? 'direct' : 'transitive';
}

/** Build a Change from an old/new package pair (either may be null for add/remove). */
function changeFromPair(
  name: string,
  oldPkg: NormalizedPackage | null,
  newPkg: NormalizedPackage | null,
): Change {
  const oldVersion = oldPkg ? parseVersion(oldPkg.version) : null;
  const newVersion = newPkg ? parseVersion(newPkg.version) : null;
  return {
    name,
    oldSourceKey: oldPkg?.sourceKey ?? null,
    newSourceKey: newPkg?.sourceKey ?? null,
    kind: classify(oldVersion, newVersion),
    oldVersion,
    newVersion,
    bump: bumpOf(oldVersion, newVersion),
    scope: scopeOf(oldPkg, newPkg),
  };
}

/**
 * Compute the version changes between two normalized lockfiles.
 *
 * Groups each side's packages by bare name, cancels unchanged same-version
 * entries first, then pairs exactly-one-old with exactly-one-new as an
 * upgrade/downgrade/changed. Ambiguous many-to-many leftovers fall back to
 * added/removed rows so duplicate/triplicate resolutions are never lost.
 *
 * Deterministic ordering: names are visited in first-seen order (old side,
 * then new-only names); within a name's fallback rows, lockfile order is kept.
 */
export function diff(
  oldLock: NormalizedLockfile,
  newLock: NormalizedLockfile,
  shallow: boolean,
): Changes {
  const oldPackages = packagesFor(oldLock, shallow);
  const newPackages = packagesFor(newLock, shallow);
  const oldByName = groupByName(oldPackages);
  const newByName = groupByName(newPackages);

  // First-seen order: old names, then names only present on the new side.
  const names = [...oldByName.keys()];
  for (const name of newByName.keys()) {
    if (!oldByName.has(name)) names.push(name);
  }

  const changes: Change[] = [];
  for (const name of names) {
    const { oldRemaining, newRemaining } = cancelUnchanged(
      oldByName.get(name) ?? [],
      newByName.get(name) ?? [],
    );
    if (oldRemaining.length === 0 && newRemaining.length === 0) continue;
    if (oldRemaining.length === 1 && newRemaining.length === 1) {
      changes.push(changeFromPair(name, oldRemaining[0], newRemaining[0]));
      continue;
    }
    for (const oldPkg of oldRemaining) changes.push(changeFromPair(name, oldPkg, null));
    for (const newPkg of newRemaining) changes.push(changeFromPair(name, null, newPkg));
  }
  return changes;
}
