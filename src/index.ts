/** Public API: the configured-instance factory (better-auth-style). */
export { createDiffLockfiles } from './factory.js';
/** Public API: the pure diff function (also available as `dlf.diff`). */
export { diff } from './diff.js';
/** Public API: the version parser. */
export { parseVersion } from './changes.js';

/** Instance + option types. */
export type { DiffLockfiles, DiffLockfilesOptions } from './factory.js';
/** Diff result types. */
export type { Changes, Change, ChangeKind, Version, Bump } from './changes.js';
/** Lockfile normalization types. */
export type { LockfileAdapter, NormalizedLockfile, NormalizedPackage } from './formats/types.js';
/** Rendering types (renderers themselves live at `diff-lockfiles/renderers`). */
export type {
	Format,
	RenderOptions,
	Renderer,
	LockfileDiff,
	LockfileDiffs,
} from './renderers/types.js';
