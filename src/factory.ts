import { diff } from './diff.js';
import { defaultParsers } from './parsers/index.js';
import type { LockfileParser, NormalizedLockfile } from './parsers/types.js';
import type { Changes } from './changes.js';

/** A side that is absent (file added/removed) is diffed as an empty lockfile. */
const EMPTY_LOCKFILE: NormalizedLockfile = { packages: {} };

/** Options for {@link createDiffLockfiles}. `parsers` defaults to all built-ins. */
export interface DiffLockfilesOptions {
	/** Lockfile parsers. Default: all five built-ins (`defaultParsers`).
	 *  Dispatch is first-match by insertion order; to override a built-in, omit it. */
	parsers?: readonly LockfileParser[];
}

/** A configured diff engine. Pure: no I/O. Holds its own parser registry.
 *  No `parse` method — call the parser directly (`npm().parse(content)`);
 *  detection-by-path lives inside `diffFile`. */
export interface DiffLockfiles {
	/** One-call diff of two content sides when you have a file path. Detects the
	 *  parser (from the path), parses both sides, diffs. `null` for a side means
	 *  "absent" (file added/removed) → diffed as an empty lockfile. Returns `[]`
	 *  when the filename matches no parser (non-lockfile path skipped). */
	diffFile(filename: string, oldContent: string | null, newContent: string | null): Changes;
	/** Pure escape hatch: diff two already-normalized lockfiles, no dispatch. */
	diff(oldLock: NormalizedLockfile, newLock: NormalizedLockfile): Changes;
}

/**
 * Build a configured diff engine. Pass `parsers` to restrict or extend the
 * built-in set; omit for all five defaults. The instance owns no I/O — for
 * git-driven repo diffs, use `diffGitRefs` from `diff-lockfiles/git`.
 */
export function createDiffLockfiles(options: DiffLockfilesOptions = {}): DiffLockfiles {
	const parsers = options.parsers ?? defaultParsers;

	const parserFor = (filename: string): LockfileParser | undefined =>
		parsers.find((parser) => parser.matches(filename));

	return {
		diffFile(filename, oldContent, newContent) {
			const parser = parserFor(filename);
			if (!parser) return [];
			const oldLock = oldContent === null ? EMPTY_LOCKFILE : parser.parse(oldContent);
			const newLock = newContent === null ? EMPTY_LOCKFILE : parser.parse(newContent);
			return diff(oldLock, newLock);
		},
		diff(oldLock, newLock) {
			return diff(oldLock, newLock);
		},
	};
}
