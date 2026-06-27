import { execSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createGitSource } from '../../src/sources/git.js';

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
 */

/** Write a minimal package-lock.json with the given lodash version. */
function writeLock(version: string): void {
	writeFileSync(
		join(process.cwd(), 'package-lock.json'),
		JSON.stringify({
			packages: {
				'': { version: '1.0.0' },
				'node_modules/lodash': { version },
			},
		}),
	);
}

describe('createGitSource (real git)', () => {
	let originalCwd: string;
	let repo: string;
	let fromSha: string;
	let toSha: string;

	beforeAll(() => {
		originalCwd = process.cwd();
		repo = mkdtempSync(join(tmpdir(), 'diff-lockfiles-git-'));
		process.chdir(repo);

		// Disable any global git hook templates / GPG signing that could interfere.
		execSync('git init -q');
		execSync('git config user.email test@example.com');
		execSync('git config user.name test');
		execSync('git config commit.gpgsign false');

		writeLock('4.17.20');
		execSync('git add -A && git commit -qm "init with lockfile"');
		fromSha = execSync('git rev-parse HEAD').toString().trim();

		writeLock('4.17.21');
		execSync('git add -A && git commit -qm "upgrade lodash"');
		toSha = execSync('git rev-parse HEAD').toString().trim();
	});

	afterAll(() => {
		process.chdir(originalCwd);
		rmSync(repo, { recursive: true, force: true });
	});

	const source = createGitSource();

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
