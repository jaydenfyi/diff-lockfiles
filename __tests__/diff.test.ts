import { diff } from '../src/diff.js';
import { changeEntry, makePackage } from './helpers.js';

describe('diff (array output)', () => {
	it('emits one change per package with bare name and provenance keys', () => {
		const oldLock = {
			packages: {
				express: makePackage('express', '4.18.0', 'node_modules/express', true), // direct, changed
				accepts: makePackage('accepts', '1.3.7', 'node_modules/accepts'), // transitive, changed
			},
			directDependencyInfoAvailable: true,
		};
		const newLock = {
			packages: {
				express: makePackage('express', '4.18.2', 'node_modules/express', true),
				accepts: makePackage('accepts', '1.3.8', 'node_modules/accepts'),
			},
			directDependencyInfoAvailable: true,
		};
		expect(diff(oldLock, newLock, false)).toEqual([
			changeEntry('express', '4.18.0', '4.18.2', {
				oldSourceKey: 'node_modules/express',
				newSourceKey: 'node_modules/express',
			}),
			changeEntry('accepts', '1.3.7', '1.3.8', {
				oldSourceKey: 'node_modules/accepts',
				newSourceKey: 'node_modules/accepts',
			}),
		]);
	});

	it('drops unchanged packages', () => {
		const oldLock = {
			packages: {
				express: makePackage('express', '4.18.0'), // unchanged -> dropped
				lodash: makePackage('lodash', '4.17.21'), // downgrade
			},
		};
		const newLock = {
			packages: {
				express: makePackage('express', '4.18.0'),
				lodash: makePackage('lodash', '4.17.20'),
			},
		};
		expect(diff(oldLock, newLock, false)).toEqual([changeEntry('lodash', '4.17.21', '4.17.20')]);
	});

	it('returns an empty array for two empty lockfiles', () => {
		expect(diff({ packages: {} }, { packages: {} }, false)).toEqual([]);
	});

	it('does not throw on non-semver specifiers (classifies as changed)', () => {
		const oldLock = { packages: { foo: makePackage('foo', 'git+ssh://host/a') } };
		const newLock = { packages: { foo: makePackage('foo', 'git+ssh://host/b') } };
		expect(diff(oldLock, newLock, false)).toEqual([
			changeEntry('foo', 'git+ssh://host/a', 'git+ssh://host/b'),
		]);
	});
});

describe('diff (shallow via directDependencyInfoAvailable)', () => {
	it('only includes direct packages when shallow and direct info is available', () => {
		const oldLock = {
			packages: {
				express: makePackage('express', '4.18.0', 'express', true),
				accepts: makePackage('accepts', '1.3.7'), // transitive; filtered out
			},
			directDependencyInfoAvailable: true,
		};
		const newLock = {
			packages: {
				express: makePackage('express', '4.18.2', 'express', true),
				accepts: makePackage('accepts', '1.3.8'),
			},
			directDependencyInfoAvailable: true,
		};
		expect(diff(oldLock, newLock, true)).toEqual([
			changeEntry('express', '4.18.0', '4.18.2', {
				oldSourceKey: 'express',
				newSourceKey: 'express',
			}),
		]);
	});

	it('does not filter when shallow but direct info is unavailable (yarn)', () => {
		const oldLock = {
			packages: { lodash: makePackage('lodash', '1.0.0') },
			directDependencyInfoAvailable: false,
		};
		const newLock = {
			packages: { lodash: makePackage('lodash', '2.0.0') },
			directDependencyInfoAvailable: false,
		};
		expect(diff(oldLock, newLock, true)).toHaveLength(1);
	});
});

describe('diff (name-grouped resolution pairing)', () => {
	it('pairs one old and one new same-name package as an upgrade even when source keys differ', () => {
		const oldLock = { packages: { 'lodash@4.17.20': makePackage('lodash', '4.17.20') } };
		const newLock = { packages: { 'lodash@4.17.21': makePackage('lodash', '4.17.21') } };
		expect(diff(oldLock, newLock, false)).toEqual([
			expect.objectContaining({
				name: 'lodash',
				oldSourceKey: 'lodash@4.17.20',
				newSourceKey: 'lodash@4.17.21',
				kind: 'upgrade',
				bump: 'patch',
			}),
		]);
	});

	it('cancels unchanged same-name same-version entries before pairing changes', () => {
		const oldLock = {
			packages: {
				'left-pad@1.1.3': makePackage('left-pad', '1.1.3'),
				'left-pad@1.2.0': makePackage('left-pad', '1.2.0'),
				'left-pad@1.3.0': makePackage('left-pad', '1.3.0'),
			},
		};
		const newLock = {
			packages: {
				'left-pad@1.2.0': makePackage('left-pad', '1.2.0'),
				'left-pad@1.3.0': makePackage('left-pad', '1.3.0'),
				'left-pad@1.4.0': makePackage('left-pad', '1.4.0'),
			},
		};
		expect(diff(oldLock, newLock, false)).toEqual([
			expect.objectContaining({ name: 'left-pad', kind: 'upgrade', bump: 'minor' }),
		]);
	});

	it('falls back to removed/added for ambiguous many-to-many duplicate replacements', () => {
		const oldLock = {
			packages: {
				'left-pad@1.1.3': makePackage('left-pad', '1.1.3'),
				'left-pad@1.2.0': makePackage('left-pad', '1.2.0'),
			},
		};
		const newLock = {
			packages: {
				'left-pad@1.3.0': makePackage('left-pad', '1.3.0'),
				'left-pad@1.4.0': makePackage('left-pad', '1.4.0'),
			},
		};
		expect(
			diff(oldLock, newLock, false).map((change) => [
				change.kind,
				change.name,
				change.oldVersion?.raw ?? null,
				change.newVersion?.raw ?? null,
			]),
		).toEqual([
			['removed', 'left-pad', '1.1.3', null],
			['removed', 'left-pad', '1.2.0', null],
			['added', 'left-pad', null, '1.3.0'],
			['added', 'left-pad', null, '1.4.0'],
		]);
	});

	it('reports a single new version as added when no old version matches', () => {
		const oldLock = { packages: {} };
		const newLock = { packages: { 'foo@1.0.0': makePackage('foo', '1.0.0') } };
		expect(diff(oldLock, newLock, false)).toEqual([
			expect.objectContaining({ name: 'foo', kind: 'added' }),
		]);
	});

	it('skips the npm root "" project entry (empty name)', () => {
		const oldLock = { packages: { '': makePackage('', '1.0.0') } };
		const newLock = { packages: { '': makePackage('', '2.0.0') } };
		expect(diff(oldLock, newLock, false)).toEqual([]);
	});

	it('treats a build-metadata-only change as unchanged (semver.eq ignores build)', () => {
		// The canonical `isUnchanged` uses semver `eq`, which ignores build metadata,
		// so a pure build-metadata change produces no diff row. This pins the
		// documented contract end-to-end (it had been silently dropped when
		// cancellation switched to raw-string equality).
		const oldLock = {
			packages: { 'foo@1.0.0+build1': makePackage('foo', '1.0.0+build1', 'foo@1.0.0+build1') },
		};
		const newLock = {
			packages: { 'foo@1.0.0+build2': makePackage('foo', '1.0.0+build2', 'foo@1.0.0+build2') },
		};
		expect(diff(oldLock, newLock, false)).toEqual([]);
	});
});
