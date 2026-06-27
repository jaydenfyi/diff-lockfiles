import { execSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createGitSource } from '../../src/sources/git.js';
import type { LockfileSource } from '../../src/sources/types.js';

/**
 * Integration tests for the real git-backed source.
 *
 * The pipeline tests cover the added/removed-lockfile behavior with a *fake*
 * source that returns `null` directly. This file exercises the actual
 * translation layer that turns a `git show` "path does not exist" failure into
 * a `null` result — a regex over git's stderr that depends on git's phrasing
 * and on node embedding stderr in `error.message`. Spawning real git here means
 * that translation cannot silently regress while every fake-source unit test
 * stays green.
 *
 * The temp repo is driven entirely by explicit paths: `git` runs with
 * `{ cwd: repo }` and the source is created with `{ cwd: repo }`. The test
 * never calls `process.chdir`, which mutates the process-global cwd and races
 * with other concurrent test files under vitest's per-file parallelism.
 */

/** Write a minimal package-lock.json with the given lodash version into `repo`. */
function writeLock(repo: string, version: string): void {
	writeFileSync(
		join(repo, 'package-lock.json'),
		JSON.stringify({
			packages: {
				'': { version: '1.0.0' },
				'node_modules/lodash': { version },
			},
		}),
	);
}

/**
 * Best-effort recursive removal of the temp repo. On macOS `rmSync` on a git
 * repo dir can intermittently throw ENOTEMPTY (git's internal files not yet
 * released by the OS) — especially under concurrent test-file load — which
 * would otherwise fail the whole suite from afterAll. Retry briefly; a leaked
 * temp dir is disposable ($TMPDIR is reclaimed by the OS) and far preferable to
 * a flaky red build, so a persistent failure is warned, not thrown.
 */
async function cleanRepo(repo: string): Promise<void> {
	for (let attempt = 0; attempt < 5; attempt++) {
		try {
			rmSync(repo, { recursive: true, force: true });
			return;
		} catch (error) {
			if (attempt < 4) await delay(50);
			else
				console.warn(
					`[git.test] could not clean temp repo ${repo}: ${(error as NodeJS.ErrnoException).code}`,
				);
		}
	}
}

describe('createGitSource (real git)', () => {
	let repo: string;
	let fromSha: string;
	let toSha: string;
	let source: LockfileSource;

	beforeAll(() => {
		repo = mkdtempSync(join(tmpdir(), 'diff-lockfiles-git-'));

		// Disable any global git hook templates / GPG signing that could interfere.
		execSync('git init -q', { cwd: repo });
		execSync('git config user.email test@example.com', { cwd: repo });
		execSync('git config user.name test', { cwd: repo });
		execSync('git config commit.gpgsign false', { cwd: repo });

		writeLock(repo, '4.17.20');
		execSync('git add -A && git commit -qm "init with lockfile"', { cwd: repo });
		fromSha = execSync('git rev-parse HEAD', { cwd: repo }).toString().trim();

		writeLock(repo, '4.17.21');
		execSync('git add -A && git commit -qm "upgrade lodash"', { cwd: repo });
		toSha = execSync('git rev-parse HEAD', { cwd: repo }).toString().trim();

		// Run git against the temp repo via explicit cwd, not a process-global chdir.
		source = createGitSource({ cwd: repo });
	});

	afterAll(async () => {
		await cleanRepo(repo);
	});

	it('read() returns the file content when the path exists at the ref', async () => {
		const content = await source.read(toSha, 'package-lock.json');
		expect(content).not.toBeNull();
		expect(JSON.parse(content as string).packages['node_modules/lodash'].version).toBe('4.17.21');
	});

	it('read() resolves null when the path is absent at the ref (added/removed lockfile side)', async () => {
		// A path that never existed at `fromSha` — the case the pipeline relies on
		// to diff a lockfile that was added or removed between refs as fully
		// added/removed instead of crashing.
		await expect(source.read(fromSha, 'does-not-exist.json')).resolves.toBeNull();
	});

	it('read() rethrows real errors (bad ref) instead of swallowing them as null', async () => {
		// A bad ref is a genuine user error, not a missing file — it must surface.
		await expect(source.read('not-a-real-ref', 'package-lock.json')).rejects.toThrow();
	});

	it('listChanged() returns the paths that changed between the two refs', async () => {
		const changed = await source.listChanged(fromSha, toSha);
		expect(changed).toContain('package-lock.json');
	});
});
