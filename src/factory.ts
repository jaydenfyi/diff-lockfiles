import { diff } from './diff.js';
import { defaultFormats } from './formats/index.js';
import type { LockfileAdapter, NormalizedLockfile } from './formats/types.js';
import type { Changes } from './changes.js';

/** A side that is absent (file added/removed) is diffed as an empty lockfile. */
const EMPTY_LOCKFILE: NormalizedLockfile = { packages: {} };

/** Options for {@link createDiffLockfiles}. `formats` defaults to all built-ins. */
export interface DiffLockfilesOptions {
	/** Lockfile format adapters. Default: all five built-ins (`defaultFormats`).
	 *  Dispatch is first-match by insertion order; to override a built-in, omit it. */
	formats?: readonly LockfileAdapter[];
}

/** A configured diff engine. Pure: no I/O. Holds its own format registry.
 *  No `parse` method — call the adapter directly (`npm().parse(content)`);
 *  detection-by-path lives inside `diffFile`. */
export interface DiffLockfiles {
	/** One-call diff of two content sides when you have a file path. Detects the
	 *  format (from the path), parses both sides, diffs. `null` for a side means
	 *  "absent" (file added/removed) → diffed as an empty lockfile. Returns `[]`
	 *  when the filename matches no format (non-lockfile path skipped). */
	diffFile(filename: string, oldContent: string | null, newContent: string | null): Changes;
	/** Pure escape hatch: diff two already-normalized lockfiles, no dispatch. */
	diff(oldLock: NormalizedLockfile, newLock: NormalizedLockfile): Changes;
}

/**
 * Build a configured diff engine. Pass `formats` to restrict or extend the
 * built-in set; omit for all five defaults. The instance owns no I/O — for
 * git-driven repo diffs, use `diffGitRefs` from `diff-lockfiles/git`.
 */
export function createDiffLockfiles(options: DiffLockfilesOptions = {}): DiffLockfiles {
	const formats = options.formats ?? defaultFormats;

	const adapterFor = (filename: string): LockfileAdapter | undefined =>
		formats.find((adapter) => adapter.matches(filename));

	return {
		diffFile(filename, oldContent, newContent) {
			const adapter = adapterFor(filename);
			if (!adapter) return [];
			const oldLock = oldContent === null ? EMPTY_LOCKFILE : adapter.parse(oldContent);
			const newLock = newContent === null ? EMPTY_LOCKFILE : adapter.parse(newContent);
			return diff(oldLock, newLock);
		},
		diff(oldLock, newLock) {
			return diff(oldLock, newLock);
		},
	};
}
