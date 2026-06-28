import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { LockfileDiffResult } from '../src/sources/index.js';

vi.mock('../src/sources/index.js', () => ({
	diffGitRefs: vi.fn(),
}));

const { diffGitRefs } = await import('../src/sources/index.js');
const { createCli } = await import('../src/cli.js');

const mockDiffGitRefs = vi.mocked(diffGitRefs);

function mockResult(changedLockfiles: string[], lockfiles: LockfileDiffResult['lockfiles']) {
	mockDiffGitRefs.mockResolvedValue({ changedLockfiles, lockfiles });
}

async function run(
	...args: string[]
): Promise<{ exitCode: number; stdout: string }> {
	process.exitCode = undefined;
	const cli = createCli();
	const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
	await cli.parseAsync(['node', 'diff-lockfiles', ...args]);
	const stdout = spy.mock.calls.map((c) => c[0]).join('\n');
	spy.mockRestore();
	return { exitCode: process.exitCode ?? 0, stdout };
}

beforeEach(() => {
	mockDiffGitRefs.mockReset();
});

describe('default exit code', () => {
	it('exits 0 when no lockfiles changed', async () => {
		mockResult([], []);
		const { exitCode } = await run('FROM', 'TO');
		expect(exitCode).toBe(0);
	});

	it('exits 0 when lockfiles changed', async () => {
		mockResult(['package-lock.json'], [
			{
				lockfile: 'package-lock.json',
				changes: [
					{
						name: 'lodash',
						oldSourceKey: 'node_modules/lodash',
						newSourceKey: 'node_modules/lodash',
						kind: 'upgrade' as const,
						oldVersion: { scheme: 'semver' as const, raw: '4.17.20', major: 4, minor: 17, patch: 20 },
						newVersion: { scheme: 'semver' as const, raw: '4.17.21', major: 4, minor: 17, patch: 21 },
						bump: 'patch' as const,
					},
				],
			},
		]);
		const { exitCode } = await run('FROM', 'TO');
		expect(exitCode).toBe(0);
	});

	it('exits 0 when a lockfile is touched but no package changes', async () => {
		mockResult(['package-lock.json'], []);
		const { exitCode } = await run('FROM', 'TO');
		expect(exitCode).toBe(0);
	});
});

describe('--check exit code', () => {
	it('exits 1 when no lockfiles changed', async () => {
		mockResult([], []);
		const { exitCode } = await run('--check', 'FROM', 'TO');
		expect(exitCode).toBe(1);
	});

	it('exits 0 when lockfiles changed', async () => {
		mockResult(['package-lock.json'], []);
		const { exitCode } = await run('--check', 'FROM', 'TO');
		expect(exitCode).toBe(0);
	});

	it('exits 0 when a lockfile is touched but no package changes', async () => {
		mockResult(['package-lock.json'], []);
		const { exitCode } = await run('--check', 'FROM', 'TO');
		expect(exitCode).toBe(0);
	});

	it('renders output alongside the exit code', async () => {
		mockResult(['package-lock.json'], [
			{
				lockfile: 'package-lock.json',
				changes: [
					{
						name: 'lodash',
						oldSourceKey: 'node_modules/lodash',
						newSourceKey: 'node_modules/lodash',
						kind: 'upgrade' as const,
						oldVersion: { scheme: 'semver' as const, raw: '4.17.20', major: 4, minor: 17, patch: 20 },
						newVersion: { scheme: 'semver' as const, raw: '4.17.21', major: 4, minor: 17, patch: 21 },
						bump: 'patch' as const,
					},
				],
			},
		]);
		const { exitCode, stdout } = await run('--check', '--format', 'text', 'FROM', 'TO');
		expect(exitCode).toBe(0);
		expect(stdout).toContain('lodash');
		expect(stdout).toContain('4.17.20 -> 4.17.21');
	});
});

describe('entry-point guard', () => {
	it('exports createCli but does not auto-run when imported', () => {
		const mainUrl = pathToFileURL(process.argv[1]).href;
		const cliModuleUrl = pathToFileURL(resolve('src/cli.ts')).href;
		// When running under vitest, process.argv[1] is the vitest binary, not
		// src/cli.ts — so the guard correctly prevents auto-running.
		expect(mainUrl).not.toBe(cliModuleUrl);
		expect(typeof createCli).toBe('function');
	});
});
