import { describe, it, expect } from 'vitest';
import { createDiffLockfiles } from '../src/factory.js';
import { diffLockfiles } from '../src/index.js';
import { npm, defaultParsers } from '../src/parsers/index.js';
import type { LockfileParser } from '../src/parsers/index.js';
import { loadFixture, FIXTURE_FILENAME, makePackage } from './helpers.js';

describe('createDiffLockfiles instance', () => {
	it('createDiffLockfiles() is lightweight: no parsers by default', () => {
		// The factory does NOT register built-ins — diffFile returns [] for any
		// filename until parsers are passed. Use the `diffLockfiles` singleton for
		// all built-ins, or spread `defaultParsers`.
		const empty = createDiffLockfiles();
		expect(
			empty.diffFile(
				FIXTURE_FILENAME.npm,
				loadFixture('npm', 'pair-old'),
				loadFixture('npm', 'pair-new'),
			),
		).toEqual([]);
	});

	it('diffLockfiles (the exported singleton) has all built-in parsers', () => {
		expect(
			diffLockfiles.diffFile(
				FIXTURE_FILENAME.npm,
				loadFixture('npm', 'pair-old'),
				loadFixture('npm', 'pair-new'),
			).length,
		).toBeGreaterThan(0);
		expect(
			diffLockfiles.diffFile(
				FIXTURE_FILENAME.bun,
				loadFixture('bun', 'pair-old'),
				loadFixture('bun', 'pair-new'),
			).length,
		).toBeGreaterThan(0);
	});

	it('diffFile diffs a real npm fixture pair end-to-end', () => {
		const changes = diffLockfiles.diffFile(
			FIXTURE_FILENAME.npm,
			loadFixture('npm', 'pair-old'),
			loadFixture('npm', 'pair-new'),
		);
		expect(changes.length).toBeGreaterThan(0);
		expect(changes.every((c) => c.name)).toBe(true);
	});

	it('diffFile treats null old content as fully-added', () => {
		const changes = diffLockfiles.diffFile(FIXTURE_FILENAME.npm, null, loadFixture('npm', 'pair-new'));
		expect(changes.every((c) => c.kind === 'added')).toBe(true);
	});

	it('diffFile treats null new content as fully-removed', () => {
		const changes = diffLockfiles.diffFile(FIXTURE_FILENAME.npm, loadFixture('npm', 'pair-old'), null);
		expect(changes.every((c) => c.kind === 'removed')).toBe(true);
	});

	it('diffFile returns [] for a non-lockfile filename', () => {
		expect(diffLockfiles.diffFile('README.md', 'a', 'b')).toEqual([]);
	});

	it('diff (escape hatch) works on hand-built normalized lockfiles', () => {
		const oldLock = { packages: { a: makePackage('a', '1.0.0') } };
		const newLock = { packages: { a: makePackage('a', '1.1.0') } };
		const changes = diffLockfiles.diff(oldLock, newLock);
		expect(changes).toHaveLength(1);
		expect(changes[0].bump).toBe('minor');
	});

	it('custom parsers: restricting to [npm()] drops the others', () => {
		const npmOnly = createDiffLockfiles({ parsers: [npm()] });
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

	it('first-match dispatch: the first parser to match a filename wins (insertion order)', () => {
		// A custom parser that ALSO matches the npm filename, returning a fixed
		// sentinel package regardless of content. Prepend it before defaultParsers.
		// old=null → empty lockfile; new → the winning parser parses 'whatever'
		// into the sentinel. If first-match holds, custom wins → exactly one change
		// (sentinel, added). If npm won instead, the real npm fixture → many packages.
		const customSentinel = '__CUSTOM_WON__';
		const customNpm = (): LockfileParser => ({
			matches: (f) => f === FIXTURE_FILENAME.npm,
			parse: () => ({
				packages: {
					sentinel: { name: customSentinel, version: '0.0.0', sourceKey: customSentinel },
				},
			}),
		});
		const d = createDiffLockfiles({ parsers: [customNpm(), ...defaultParsers] });
		const changes = d.diffFile(FIXTURE_FILENAME.npm, null, loadFixture('npm', 'pair-new'));
		expect(changes).toHaveLength(1);
		expect(changes[0].name).toBe(customSentinel);
	});
});
