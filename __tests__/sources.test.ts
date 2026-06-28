import { diffChangedLockfiles, diffGitRefs } from '../src/sources/index.js';
import { diffLockfiles } from '../src/index.js';
import { text, json } from '../src/renderers/index.js';
import type { LockfileSource } from '../src/sources/types.js';
import { FIXTURE_FILENAME, FIXTURE_MANAGERS, loadFixture } from './helpers.js';

// Minimal package-lock.json v2/v3 bodies. The root "" entry carries the
// project version (same in both → unchanged → filtered out), matching real
// package-lock.json structure; the one dependency changes version.
const oldLock = JSON.stringify({
	packages: { '': { version: '1.0.0' }, 'node_modules/lodash': { version: '4.17.20' } },
});
const newLock = JSON.stringify({
	packages: { '': { version: '1.0.0' }, 'node_modules/lodash': { version: '4.17.21' } },
});

/** A fake source returning canned content by ref, plus a fixed "changed" list. */
function fakeSource(
	contentByRef: Record<string, Record<string, string>>,
	changed: string[],
): LockfileSource {
	return {
		async listChanged() {
			return changed;
		},
		async read(ref, filename) {
			// Missing ref/filename -> null (absent at that side), matching the git
			// source's contract for a lockfile added or removed between refs.
			return contentByRef[ref]?.[filename] ?? null;
		},
	};
}

describe('diffChangedLockfiles', () => {
	it('diffs a changed lockfile end-to-end with zero git', async () => {
		const source = fakeSource(
			{ FROM: { 'package-lock.json': oldLock }, TO: { 'package-lock.json': newLock } },
			// Include a non-lockfile path to prove it is filtered out by the adapter.
			['package-lock.json', 'README.md'],
		);

		const diffs = await diffChangedLockfiles(diffLockfiles, source, 'FROM', 'TO');
		const out = text().render(diffs, { color: false });

		expect(out).toEqual('── package-lock.json ──\nlodash 4.17.20 -> 4.17.21 ↑ patch');
	});

	it('does nothing (and does not throw) when no lockfiles changed', async () => {
		const source = fakeSource({}, []);

		const diffs = await diffChangedLockfiles(diffLockfiles, source, 'a', 'b');
		expect(diffs).toEqual([]);
	});

	it('treats a newly-added lockfile as fully added (no crash)', async () => {
		// The lockfile does not exist at FROM (added in TO). The source returns null
		// for the missing side; every package on the present side shows as added.
		const source = fakeSource({ TO: { 'package-lock.json': newLock } }, ['package-lock.json']);

		const diffs = await diffChangedLockfiles(diffLockfiles, source, 'FROM', 'TO');
		const out = text().render(diffs, { color: false });

		// The whole lockfile is new, so every dependency entry shows as added (no
		// crash). The root "" project entry is skipped (empty name), so only the
		// real dependency `lodash` appears; lodash is transitive.
		expect(out).toEqual('── package-lock.json ──\nlodash added 4.17.21');
	});

	it('treats a removed lockfile as fully removed (no crash)', async () => {
		// Symmetric: the lockfile exists only at FROM (removed in TO).
		const source = fakeSource({ FROM: { 'package-lock.json': oldLock } }, ['package-lock.json']);

		const diffs = await diffChangedLockfiles(diffLockfiles, source, 'FROM', 'TO');
		const out = text().render(diffs, { color: false });

		// Symmetric to the added case: every dependency entry is removed (the root
		// "" project entry is skipped).
		expect(out).toEqual('── package-lock.json ──\nlodash removed 4.17.20');
	});

	it('renders multiple changed lockfiles with identity in every format', async () => {
		// Two changed lockfiles in one run (incl. a nested monorepo path): proves
		// the headline fixes — text carries per-lockfile headers, and JSON is a
		// single valid document keyed by lockfile (was glued, unparseable before).
		const npmOld = JSON.stringify({ packages: { 'node_modules/lodash': { version: '4.17.20' } } });
		const npmNew = JSON.stringify({ packages: { 'node_modules/lodash': { version: '4.17.21' } } });
		const bunNew = JSON.stringify({
			lockfileVersion: 0,
			packages: { express: ['express@4.19.0'] },
		});
		const source = fakeSource(
			{
				FROM: { 'package-lock.json': npmOld },
				TO: { 'package-lock.json': npmNew, 'apps/api/bun.lock': bunNew },
			},
			['package-lock.json', 'apps/api/bun.lock'],
		);

		const diffs = await diffChangedLockfiles(diffLockfiles, source, 'FROM', 'TO');

		// json: ONE valid document, keyed by lockfile, parseable.
		const jsonOut = json().render(diffs, { color: false });
		const parsed = JSON.parse(jsonOut); // throws if invalid (the old bug)
		expect(Object.keys(parsed).sort()).toEqual(['apps/api/bun.lock', 'package-lock.json']);

		// text: both filenames appear as headers.
		const textOut = text().render(diffs, { color: false });
		expect(textOut).toContain('── apps/api/bun.lock ──');
		expect(textOut).toContain('── package-lock.json ──');
	});
});

// Minimal valid lockfile bodies for every supported format, each containing a
// single package "x" at version 1.0.0. Used to prove each adapter is registered
// and reachable through the pipeline (a forgotten import would silently skip
// the format). Content lives only on the TO side, so the package shows as added.
const SINGLE_PACKAGE_LOCKFILES: Record<string, string> = {
	'package-lock.json': JSON.stringify({ packages: { 'node_modules/x': { version: '1.0.0' } } }),
	'bun.lock': JSON.stringify({ lockfileVersion: 0, packages: { x: ['x@1.0.0'] } }),
	'pnpm-lock.yaml': 'packages:\n  x@1.0.0:\n    resolution: {integrity: sha512-aaa=}\n',
	'aube-lock.yaml': 'packages:\n  x@1.0.0:\n    resolution: {integrity: sha512-aaa=}\n',
	'yarn.lock': 'x@^1.0.0:\n  version "1.0.0"\n',
};

describe('adapter registration', () => {
	it.each(Object.keys(SINGLE_PACKAGE_LOCKFILES))(
		'recognizes %s through the pipeline',
		async (filename) => {
			const source = fakeSource({ TO: { [filename]: SINGLE_PACKAGE_LOCKFILES[filename] } }, [
				filename,
			]);

			const diffs = await diffChangedLockfiles(diffLockfiles, source, 'FROM', 'TO');

			// A recognized format yields one diff whose rendered body mentions the
			// package as added; an unregistered adapter would yield nothing.
			expect(diffs).toHaveLength(1);
			const out = text().render(diffs, { color: false });
			expect(out).toMatch(/added/);
		},
	);

	it('silently skips an unrecognized filename', async () => {
		const source = fakeSource({ TO: { 'not-a-lockfile.txt': 'whatever' } }, ['not-a-lockfile.txt']);
		const diffs = await diffChangedLockfiles(diffLockfiles, source, 'FROM', 'TO');
		expect(diffs).toEqual([]);
	});
});

// The headline bug fix: pnpm/yarn/aube key packages by `name@version`, so a
// single version bump used to render as `removed` + `added` instead of one
// upgrade/downgrade. These prove each format now pairs by bare name.
const PAIR_BUMP_FIXTURES = {
	pnpm: {
		filename: 'pnpm-lock.yaml',
		old: `lockfileVersion: '9.0'\nimporters:\n  '.':\n    dependencies:\n      lodash:\n        specifier: ^4.17.20\n        version: 4.17.20\npackages:\n  lodash@4.17.20:\n    resolution: {integrity: sha512-aaa=}\n`,
		new: `lockfileVersion: '9.0'\nimporters:\n  '.':\n    dependencies:\n      lodash:\n        specifier: ^4.17.21\n        version: 4.17.21\npackages:\n  lodash@4.17.21:\n    resolution: {integrity: sha512-bbb=}\n`,
	},
	yarn: {
		filename: 'yarn.lock',
		old: 'lodash@^4.17.20:\n  version "4.17.20"\n',
		new: 'lodash@^4.17.21:\n  version "4.17.21"\n',
	},
	aube: {
		filename: 'aube-lock.yaml',
		old: `lockfileVersion: '9.0'\nimporters:\n  '.':\n    dependencies:\n      lodash:\n        specifier: ^4.17.20\n        version: 4.17.20\npackages:\n  lodash@4.17.20:\n    resolution: {integrity: sha512-aaa=}\n`,
		new: `lockfileVersion: '9.0'\nimporters:\n  '.':\n    dependencies:\n      lodash:\n        specifier: ^4.17.21\n        version: 4.17.21\npackages:\n  lodash@4.17.21:\n    resolution: {integrity: sha512-bbb=}\n`,
	},
};

describe('pair-by-name bump fix', () => {
	it.each(Object.keys(PAIR_BUMP_FIXTURES))(
		'renders %s single version bump as one upgrade (not remove + add)',
		async (format) => {
			const {
				filename,
				old,
				new: newer,
			} = PAIR_BUMP_FIXTURES[format as keyof typeof PAIR_BUMP_FIXTURES];
			const source = fakeSource({ FROM: { [filename]: old }, TO: { [filename]: newer } }, [
				filename,
			]);

			const diffs = await diffChangedLockfiles(diffLockfiles, source, 'FROM', 'TO');
			const out = text().render(diffs, { color: false });

			expect(out).toContain('──');
			expect(out).toContain('lodash 4.17.20 -> 4.17.21 ↑ patch');
			// The bug: these must NOT appear.
			expect(out).not.toContain('lodash@4.17.20 removed');
			expect(out).not.toContain('lodash@4.17.21 added');
			expect(out).not.toContain('removed 4.17.20');
			expect(out).not.toContain('added 4.17.21');
		},
	);
});

// Multi-version (workspace) fixtures generated by real package managers. Each
// manager pins different `left-pad` versions across workspace members, forcing
// genuine duplicate/triplicate resolution. See fixtures/multi-version/README.md.
describe('multi-version resolution (real fixtures)', () => {
	it.each(FIXTURE_MANAGERS)(
		'pairs one upgrade for %s after cancelling unchanged versions',
		async (manager) => {
			const filename = FIXTURE_FILENAME[manager];
			const source = fakeSource(
				{
					FROM: { [filename]: loadFixture(manager, 'pair-old') },
					TO: { [filename]: loadFixture(manager, 'pair-new') },
				},
				[filename],
			);

			const diffs = await diffChangedLockfiles(diffLockfiles, source, 'FROM', 'TO');
			const out = text().render(diffs, { color: false });

			// One clean upgrade; cancelled versions (1.1.3, 1.2.0) never appear.
			expect(out).toContain('left-pad 1.0.2 -> 1.3.0 ↑ minor');
			expect(out).not.toMatch(/left-pad .*removed 1\.(1|2)\.0/);
			expect(out).not.toMatch(/left-pad .*added 1\.(1|2)\.0/);
			// No lockfile key leakage into the display name.
			expect(out).not.toContain('left-pad@');
			expect(out).not.toContain('node_modules/left-pad ');
		},
	);

	it.each(FIXTURE_MANAGERS)(
		'falls back to removed/added rows for %s ambiguous many-to-many',
		async (manager) => {
			const filename = FIXTURE_FILENAME[manager];
			const source = fakeSource(
				{
					FROM: { [filename]: loadFixture(manager, 'fallback-old') },
					TO: { [filename]: loadFixture(manager, 'fallback-new') },
				},
				[filename],
			);

			const diffs = await diffChangedLockfiles(diffLockfiles, source, 'FROM', 'TO');
			const out = text().render(diffs, { color: false });

			const removed = out.split('\n').filter((line) => /left-pad .*removed/.test(line));
			const added = out.split('\n').filter((line) => /left-pad .*added/.test(line));
			expect(removed).toHaveLength(2);
			expect(added).toHaveLength(2);
			// All rows use the bare name; versions differ so no provenance disambiguator.
			expect(out).not.toContain('left-pad@');
		},
	);

	it.each(FIXTURE_MANAGERS)(
		'emits a name-keyed JSON array for %s with provenance',
		async (manager) => {
			const filename = FIXTURE_FILENAME[manager];
			const source = fakeSource(
				{
					FROM: { [filename]: loadFixture(manager, 'fallback-old') },
					TO: { [filename]: loadFixture(manager, 'fallback-new') },
				},
				[filename],
			);

			const diffs = await diffChangedLockfiles(diffLockfiles, source, 'FROM', 'TO');
			const out = json().render(diffs, { color: false });
			const parsed = JSON.parse(out);
			// Name-keyed (bare `left-pad`), array value, 4 entries, each carrying source keys.
			expect(parsed[filename]['left-pad']).toHaveLength(4);
			expect(
				parsed[filename]['left-pad'].every(
					(change: { oldSourceKey: string | null; newSourceKey: string | null }) =>
						change.oldSourceKey !== null || change.newSourceKey !== null,
				),
			).toBe(true);
		},
	);
});

describe('diffGitRefs', () => {
	it('is a function delegating to diffChangedLockfiles via a git source', () => {
		// diffGitRefs builds a real git source; the injectable-seam tests above
		// carry orchestration coverage, and end-to-end git is smoke-tested in
		// the final task. Here we only confirm it is wired and callable.
		expect(typeof diffGitRefs).toBe('function');
	});
});
