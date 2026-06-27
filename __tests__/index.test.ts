import { diff } from '../src/index.js';
import { changeEntry, makePackage } from './helpers.js';

describe('diff', () => {
	it('returns an empty array when given two empty objects', () => {
		expect(diff({ packages: {} }, { packages: {} })).toEqual([]);
	});

	it('classifies each change and drops unchanged packages', () => {
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
		expect(diff(oldLock, newLock)).toEqual([changeEntry('lodash', '4.17.21', '4.17.20')]);
	});

	it('does not throw on non-semver specifiers (classifies as changed)', () => {
		const oldLock = { packages: { foo: makePackage('foo', 'git+ssh://host/a') } };
		const newLock = { packages: { foo: makePackage('foo', 'git+ssh://host/b') } };
		expect(diff(oldLock, newLock)).toEqual([
			changeEntry('foo', 'git+ssh://host/a', 'git+ssh://host/b'),
		]);
	});
});
