import semver from 'semver';

/**
 * How a single package's version changed between two lockfiles.
 *
 * `added`/`removed`: the package appeared on only one side. `upgrade`/
 * `downgrade`: both sides present with valid semver that moved up/down.
 * `changed`: both sides present but not a clean semver move (e.g. a git or
 * `file:` specifier).
 */
export type ChangeKind = 'added' | 'removed' | 'upgrade' | 'downgrade' | 'changed';

/**
 * A single package's version change, pre-classified so renderers never need to
 * interpret raw versions or touch semver — they map {@link kind} to decoration.
 */
export interface Change {
  kind: ChangeKind;
  oldVersion: string | null;
  newVersion: string | null;
}

/**
 * Map of package key -> {@link Change}. This is the hand-off contract between
 * the diff layer (which produces it) and the renderers (which present it).
 */
export type Changes = Record<string, Change>;

/**
 * Classify a version change into a {@link ChangeKind}.
 *
 * Never throws: semver's compare functions throw on non-semver values, so we
 * guard with `valid()` and treat any non-semver specifier as a plain `changed`.
 */
export function classify(oldVersion: string | null, newVersion: string | null): ChangeKind {
  if (oldVersion === null) return 'added';
  if (newVersion === null) return 'removed';
  if (semver.valid(oldVersion) && semver.valid(newVersion)) {
    if (semver.lt(oldVersion, newVersion)) return 'upgrade';
    if (semver.gt(oldVersion, newVersion)) return 'downgrade';
  }
  return 'changed';
}

/**
 * Whether a package is unchanged (present on both sides with the same version).
 *
 * `diff` drops these so renderers only ever see real changes. semver's `eq`
 * throws on non-semver values, so we guard with `valid()` and fall back to exact
 * string equality for non-semver specifiers (git/`file:` URLs, etc.).
 */
export function isUnchanged(oldVersion: string | null, newVersion: string | null): boolean {
  if (oldVersion === null || newVersion === null) return false;
  if (semver.valid(oldVersion) && semver.valid(newVersion)) return semver.eq(oldVersion, newVersion);
  return oldVersion === newVersion;
}
