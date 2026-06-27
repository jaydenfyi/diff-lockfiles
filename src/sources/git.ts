import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { LockfileSource } from './types.js';

const execFilePromise = promisify(execFile);

/** Default read buffer (bytes) for `git show`. Re-exported so the CLI's
 * `--max-buffer` default and this fallback stay a single source of truth. */
export const DEFAULT_MAX_BUFFER = 1024 * 10000;

/**
 * git prints one of these messages (exit code 128) when a path is absent at a
 * ref — e.g. a lockfile that was added or removed between the two refs. We
 * detect it and resolve `null` so the pipeline can treat that side as an empty
 * lockfile instead of crashing. Any other git failure (bad ref, etc.) is a real
 * error and is rethrown.
 */
const MISSING_PATH = /does not exist|exists on disk, but not/i;

/**
 * Build a {@link LockfileSource} backed by git.
 *
 * `listChanged` runs `git diff --name-only` with no path filter — the pipeline
 * filters by lockfile adapter, so the source stays free of lockfile-specific
 * knowledge. `read` runs `git show <ref>:<path>`.
 *
 * Git is invoked via `execFile` with argv arrays (never a shell), so the
 * user-supplied refs and the repo-controlled filenames are passed as literal
 * arguments rather than interpolated into a shell string — there is no command
 * injection surface even for hostile refs or file names.
 */
export function createGitSource(options: { maxBuffer?: number } = {}): LockfileSource {
	const maxBuffer = options.maxBuffer ?? DEFAULT_MAX_BUFFER;

	async function listChanged(from: string, to: string): Promise<string[]> {
		const output = await execFilePromise('git', ['diff', '--name-only', from, to]);
		return output.stdout
			.trim()
			.split(/\r\n|\r|\n/)
			.filter(Boolean);
	}

	async function read(ref: string, filename: string): Promise<string | null> {
		try {
			const output = await execFilePromise('git', ['show', `${ref}:${filename}`], { maxBuffer });
			return output.stdout.trim();
		} catch (error) {
			// A path absent at this ref is not an error: it means the file was added
			// or removed between refs. Surface it as `null` to the pipeline.
			if (error instanceof Error && MISSING_PATH.test(error.message)) return null;
			throw error;
		}
	}

	return { listChanged, read };
}
