import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import type { LockfileSource } from './types.js';

const execPromise = promisify(exec);

/** Default read buffer (bytes) for `git show`. Matches the original CLI default. */
const DEFAULT_MAX_BUFFER = 1024 * 10000;

/**
 * Build a {@link LockfileSource} backed by git.
 *
 * `listChanged` runs `git diff --name-only` with no path filter — the pipeline
 * filters by lockfile adapter, so the source stays free of lockfile-specific
 * knowledge. `read` runs `git show <ref>:<path>`.
 */
export function createGitSource(options: { maxBuffer?: number } = {}): LockfileSource {
  const maxBuffer = options.maxBuffer ?? DEFAULT_MAX_BUFFER;

  async function listChanged(from: string, to: string): Promise<string[]> {
    const output = await execPromise(`git diff ${from} ${to} --name-only`);
    return output.stdout.trim().split(/\r\n|\r|\n/).filter(Boolean);
  }

  async function read(ref: string, filename: string): Promise<string> {
    const output = await execPromise(`git show ${ref}:${filename}`, { maxBuffer });
    return output.stdout.trim();
  }

  return { listChanged, read };
}
