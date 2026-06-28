import type { LockfileSource } from './types.js';
import { createGitSource as createGitSourceImpl, DEFAULT_MAX_BUFFER } from './git.js';
import type { DiffLockfiles } from '../factory.js';
import type { LockfileDiffs } from '../renderers/types.js';

/** Git-level diff result: touched lockfile paths plus renderable package diffs. */
export interface LockfileDiffResult {
	/** Recognized lockfile paths present in the git diff, in git's changed-file order. */
	changedLockfiles: string[];
	/** Lockfiles with package-level changes, ready for renderers. */
	lockfiles: LockfileDiffs;
}

/** Options for {@link diffGitRefs}. */
export interface GitOptions {
	/** Repo path. Omit for `process.cwd()` (production CLI behavior). */
	cwd?: string;
	/** Max read buffer (bytes) for `git show`. */
	maxBuffer?: number;
}

/**
 * Diff every changed lockfile between two refs using a {@link DiffLockfiles}
 * instance for parsing/diffing. Returns touched lockfile paths plus renderable
 * package diffs (does NOT print). Lockfiles with no package-level changes are
 * included in `changedLockfiles` but omitted from `lockfiles`.
 *
 * `source` is the only I/O seam: production passes `createGitSource(...)`,
 * tests pass a fake returning canned content — the whole pipeline is exercisable
 * with zero git on disk.
 */
export async function diffChangedLockfiles(
	diffLockfiles: DiffLockfiles,
	source: LockfileSource,
	from: string,
	to: string,
): Promise<LockfileDiffResult> {
	const files = await source.listChanged(from, to);
	const changedLockfiles: string[] = [];
	const lockfiles: LockfileDiffs = [];
	for (const filename of files) {
		if (!diffLockfiles.matches(filename)) continue;
		changedLockfiles.push(filename);
		const [oldContent, newContent] = await Promise.all([
			source.read(from, filename),
			source.read(to, filename),
		]);
		const changes = diffLockfiles.diffFile(filename, oldContent, newContent);
		if (changes.length > 0) lockfiles.push({ lockfile: filename, changes });
	}
	return { changedLockfiles, lockfiles };
}

/**
 * Thin convenience: build a git source and diff changed lockfiles between two
 * refs. One-call repo diff for programmatic CI use. Returns the diffs (no print).
 */
export async function diffGitRefs(
	diffLockfiles: DiffLockfiles,
	from: string,
	to: string,
	options: GitOptions = {},
): Promise<LockfileDiffResult> {
	const source = createGitSourceImpl({
		...(options.cwd ? { cwd: options.cwd } : {}),
		maxBuffer: options.maxBuffer ?? DEFAULT_MAX_BUFFER,
	});
	return diffChangedLockfiles(diffLockfiles, source, from, to);
}

export { createGitSource } from './git.js';
export type { LockfileSource } from './types.js';
