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

/** Semver magnitude of a version move, or null when not a clean semver bump. */
export type Bump = 'major' | 'minor' | 'patch';

/** Whether a package is a direct dependency of the root project or transitive. */
export type Scope = 'direct' | 'transitive';

/**
 * A parsed version. The `semver` arm exposes its numeric components (plus
 * optional `prerelease`/`build`, omitted entirely when absent); the `nonsemver`
 * arm only carries the raw specifier (git URLs, `file:` paths, etc.).
 */
export type Version =
  | {
      scheme: 'semver';
      raw: string;
      major: number;
      minor: number;
      patch: number;
      prerelease?: string;
      build?: string;
    }
  | { scheme: 'nonsemver'; raw: string };

/**
 * A single package's version change, pre-classified so renderers never need to
 * interpret raw versions or touch semver — they read {@link kind}, {@link bump},
 * and {@link scope} and map them to decoration.
 *
 * `name` is the bare package name shown to humans; `oldSourceKey`/`newSourceKey`
 * carry the original lockfile provenance keys, surfaced only when disambiguating
 * duplicate same-name changes.
 */
export interface Change {
  name: string;
  oldSourceKey: string | null;
  newSourceKey: string | null;
  kind: ChangeKind;
  oldVersion: Version | null;
  newVersion: Version | null;
  bump: Bump | null;
  scope: Scope;
}

/**
 * A run's worth of changes as an ordered array. Using an array (not a name-keyed
 * map) means multiple resolved versions of the same package are preserved
 * instead of overwriting each other; renderers may still group by name.
 */
export type Changes = Change[];

/**
 * Parse a raw version string into a {@link Version}.
 *
 * Valid semver yields the `semver` arm with its components; anything else (git
 * URLs, `file:` specifiers, ranges) yields the `nonsemver` arm carrying only the
 * raw string. Never throws.
 */
export function parseVersion(raw: string): Version {
  const parsed = semver.parse(raw);
  if (parsed === null) return { scheme: 'nonsemver', raw };
  const version: Version = { scheme: 'semver', raw, major: parsed.major, minor: parsed.minor, patch: parsed.patch };
  if (parsed.prerelease.length) version.prerelease = parsed.prerelease.join('.');
  if (parsed.build.length) version.build = parsed.build.join('.');
  return version;
}

/**
 * Classify a version change into a {@link ChangeKind}.
 *
 * Contract: assumes the two versions actually differ (as `diff` guarantees —
 * it drops equal pairs via `isUnchanged` first). Equal versions fall through to
 * `'changed'`; that is a defensive fallback, not a meaningful classification.
 *
 * Never throws: only the `semver` arms are compared numerically; everything else
 * is a plain `changed`.
 */
export function classify(oldVersion: Version | null, newVersion: Version | null): ChangeKind {
  if (oldVersion === null) return 'added';
  if (newVersion === null) return 'removed';
  if (oldVersion.scheme === 'semver' && newVersion.scheme === 'semver') {
    if (semver.lt(oldVersion.raw, newVersion.raw)) return 'upgrade';
    if (semver.gt(oldVersion.raw, newVersion.raw)) return 'downgrade';
  }
  return 'changed';
}

/**
 * The semver magnitude of a move (`major`/`minor`/`patch`), or null when either
 * side is missing or not clean semver. Maps prerelease diffs (`premajor`, etc.)
 * onto their release level.
 */
export function bumpOf(oldVersion: Version | null, newVersion: Version | null): Bump | null {
  if (oldVersion === null || newVersion === null) return null;
  if (oldVersion.scheme !== 'semver' || newVersion.scheme !== 'semver') return null;
  switch (semver.diff(oldVersion.raw, newVersion.raw)) {
    case 'major':
    case 'premajor':
      return 'major';
    case 'minor':
    case 'preminor':
      return 'minor';
    case 'patch':
    case 'prepatch':
    case 'prerelease':
      return 'patch';
    default:
      return null;
  }
}

/**
 * Whether a package is unchanged (present on both sides with the same version).
 *
 * `diff` drops these so renderers only ever see real changes. semver sides use
 * `eq`, which ignores build metadata, so a pure build-metadata change counts as
 * unchanged. Non-semver sides fall back to exact raw-string equality.
 */
export function isUnchanged(oldVersion: Version | null, newVersion: Version | null): boolean {
  if (oldVersion === null || newVersion === null) return false;
  if (oldVersion.scheme === 'semver' && newVersion.scheme === 'semver') {
    return semver.eq(oldVersion.raw, newVersion.raw);
  }
  return oldVersion.raw === newVersion.raw;
}
