import type { LockfileSource } from './types.js';
import { createGitSource as createGitSourceImpl, DEFAULT_MAX_BUFFER } from './git.js';
import type { DiffLockfiles } from '../factory.js';
import type { LockfileDiffs } from '../renderers/types.js';

/** Options for {@link diffGitRefs}. */
export interface GitOptions {
	/** Repo path. Omit for `process.cwd()` (production CLI behavior). */
	cwd?: string;
	/** Max read buffer (bytes) for `git show`. */
	maxBuffer?: number;
}

/**
 * Diff every changed lockfile between two refs using a {@link DiffLockfiles}
 * instance for parsing/diffing. Returns the diffs (does NOT print). Lockfiles
 * with no net changes are filtered out, so "nothing changed" → empty array.
 *
 * `source` is the only I/O seam: production passes `createGitSource(...)`,
 * tests pass a fake returning canned content — the whole pipeline is exercisable
 * with zero git on disk.
 */
export async function diffChangedLockfiles(
	dlf: DiffLockfiles,
	source: LockfileSource,
	from: string,
	to: string,
): Promise<LockfileDiffs> {
	const files = await source.listChanged(from, to);
	const diffs: LockfileDiffs = [];
	for (const filename of files) {
		const [oldContent, newContent] = await Promise.all([
			source.read(from, filename),
			source.read(to, filename),
		]);
		// diffFile returns [] for non-lockfile paths (no adapter matched) and for
		// lockfiles with no net changes — both are skipped.
		const changes = dlf.diffFile(filename, oldContent, newContent);
		if (changes.length > 0) diffs.push({ lockfile: filename, changes });
	}
	return diffs;
}

/**
 * Thin convenience: build a git source and diff changed lockfiles between two
 * refs. One-call repo diff for programmatic CI use. Returns the diffs (no print).
 */
export async function diffGitRefs(
	dlf: DiffLockfiles,
	from: string,
	to: string,
	options: GitOptions = {},
): Promise<LockfileDiffs> {
	const source = createGitSourceImpl({
		...(options.cwd ? { cwd: options.cwd } : {}),
		maxBuffer: options.maxBuffer ?? DEFAULT_MAX_BUFFER,
	});
	return diffChangedLockfiles(dlf, source, from, to);
}

export { createGitSource } from './git.js';
export type { LockfileSource } from './types.js';
