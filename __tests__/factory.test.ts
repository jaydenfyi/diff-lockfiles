import { describe, it, expect } from 'vitest';
import { createDiffLockfiles } from '../src/factory.js';
import { npm, defaultFormats } from '../src/formats/index.js';
import type { LockfileAdapter } from '../src/formats/index.js';
import { loadFixture, FIXTURE_FILENAME, makePackage } from './helpers.js';

const dlf = createDiffLockfiles(); // defaults: all 5 formats

describe('createDiffLockfiles instance', () => {
	it('defaults to all built-in formats when options omitted', () => {
		// parse is not on the instance — prove both formats are registered via diffFile.
		expect(
			dlf.diffFile(
				FIXTURE_FILENAME.npm,
				loadFixture('npm', 'pair-old'),
				loadFixture('npm', 'pair-new'),
			).length,
		).toBeGreaterThan(0);
		expect(
			dlf.diffFile(
				FIXTURE_FILENAME.bun,
				loadFixture('bun', 'pair-old'),
				loadFixture('bun', 'pair-new'),
			).length,
		).toBeGreaterThan(0);
	});

	it('diffFile diffs a real npm fixture pair end-to-end', () => {
		const changes = dlf.diffFile(
			FIXTURE_FILENAME.npm,
			loadFixture('npm', 'pair-old'),
			loadFixture('npm', 'pair-new'),
		);
		expect(changes.length).toBeGreaterThan(0);
		expect(changes.every((c) => c.name)).toBe(true);
	});

	it('diffFile treats null old content as fully-added', () => {
		const changes = dlf.diffFile(FIXTURE_FILENAME.npm, null, loadFixture('npm', 'pair-new'));
		expect(changes.every((c) => c.kind === 'added')).toBe(true);
	});

	it('diffFile treats null new content as fully-removed', () => {
		const changes = dlf.diffFile(FIXTURE_FILENAME.npm, loadFixture('npm', 'pair-old'), null);
		expect(changes.every((c) => c.kind === 'removed')).toBe(true);
	});

	it('diffFile returns [] for a non-lockfile filename', () => {
		expect(dlf.diffFile('README.md', 'a', 'b')).toEqual([]);
	});

	it('diff (escape hatch) works on hand-built normalized lockfiles', () => {
		const oldLock = { packages: { a: makePackage('a', '1.0.0') } };
		const newLock = { packages: { a: makePackage('a', '1.1.0') } };
		const changes = dlf.diff(oldLock, newLock);
		expect(changes).toHaveLength(1);
		expect(changes[0].bump).toBe('minor');
	});

	it('custom formats: restricting to [npm()] drops the others', () => {
		const npmOnly = createDiffLockfiles({ formats: [npm()] });
		// npm is registered → diffs; bun is not → [] (a non-lockfile for this instance).
		expect(
			npmOnly.diffFile(
				FIXTURE_FILENAME.npm,
				loadFixture('npm', 'pair-old'),
				loadFixture('npm', 'pair-new'),
			).length,
		).toBeGreaterThan(0);
		expect(
			npmOnly.diffFile(
				FIXTURE_FILENAME.bun,
				loadFixture('bun', 'pair-old'),
				loadFixture('bun', 'pair-new'),
			),
		).toEqual([]);
	});

	it('first-match dispatch: the first adapter to match a filename wins (insertion order)', () => {
		// A custom adapter that ALSO matches the npm filename, returning a fixed
		// sentinel package regardless of content. Prepend it before defaultFormats.
		// old=null → empty lockfile; new → the winning adapter parses 'whatever'
		// into the sentinel. If first-match holds, custom wins → exactly one change
		// (sentinel, added). If npm won instead, the real npm fixture → many packages.
		const customSentinel = '__CUSTOM_WON__';
		const customNpm = (): LockfileAdapter => ({
			matches: (f) => f === FIXTURE_FILENAME.npm,
			parse: () => ({
				packages: {
					sentinel: { name: customSentinel, version: '0.0.0', sourceKey: customSentinel },
				},
			}),
		});
		const d = createDiffLockfiles({ formats: [customNpm(), ...defaultFormats] });
		const changes = d.diffFile(FIXTURE_FILENAME.npm, null, loadFixture('npm', 'pair-new'));
		expect(changes).toHaveLength(1);
		expect(changes[0].name).toBe(customSentinel);
	});
});
