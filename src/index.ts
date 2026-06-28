import { createDiffLockfiles } from './factory.js';
import { defaultParsers } from './parsers/index.js';

/** Public API: the configured-instance factory (better-auth-style). Lightweight:
 *  no parsers by default — bring your own, or spread `defaultParsers`. */
export { createDiffLockfiles };

/**
 * A pre-configured engine with all five built-in parsers registered, ready to
 * use. The convenience path: import and call. For a custom parser set (or an
 * empty engine), use `createDiffLockfiles({ parsers: [...] })`.
 */
export const diffLockfiles = createDiffLockfiles({ parsers: [...defaultParsers] });

/** Public API: the pure diff function (also available as `diffLockfiles.diff`). */
export { diff } from './diff.js';
/** Public API: the version parser. */
export { parseVersion } from './changes.js';

/** Instance + option types. */
export type { DiffLockfiles, DiffLockfilesOptions } from './factory.js';
/** Diff result types. */
export type { Changes, Change, ChangeKind, Version, Bump } from './changes.js';
/** Lockfile normalization types. */
export type { LockfileParser, NormalizedLockfile, NormalizedPackage } from './parsers/types.js';
/** Rendering types (renderers themselves live at `diff-lockfiles/renderers`). */
export type {
	Format,
	RenderOptions,
	Renderer,
	LockfileDiff,
	LockfileDiffs,
} from './renderers/types.js';
/** Git orchestration result types. */
export type { LockfileDiffResult } from './sources/index.js';
