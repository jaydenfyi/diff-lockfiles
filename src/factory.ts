import { diff } from './diff.js';
import type { LockfileParser, NormalizedLockfile } from './parsers/types.js';
import type { Changes } from './changes.js';

/** A side that is absent (file added/removed) is diffed as an empty lockfile. */
const EMPTY_LOCKFILE: NormalizedLockfile = { packages: {} };

/** Options for {@link createDiffLockfiles}. `parsers` defaults to none (lightweight).
 *  For a pre-built engine with all built-in parsers, import the `diffLockfiles`
 *  singleton from `diff-lockfiles` instead of calling the factory with no args. */
export interface DiffLockfilesOptions {
	/** Lockfile parsers to register. Default: none — the factory is a lightweight
	 *  constructor; bring your own parsers, or spread `defaultParsers` from
	 *  `diff-lockfiles/parsers`. Dispatch is first-match by insertion order. */
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
 * Build a configured diff engine. Pass `parsers` to register lockfile parsers;
 * omit for a lightweight empty engine (no parsers → `diffFile` returns `[]`).
 * For a batteries-included engine with all five built-in parsers, import the
 * `diffLockfiles` singleton from `diff-lockfiles` instead. The instance owns no
 * I/O — for git-driven repo diffs, use `diffGitRefs` from `diff-lockfiles/git`.
 */
export function createDiffLockfiles(options: DiffLockfilesOptions = {}): DiffLockfiles {
	const parsers = options.parsers ?? [];

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
