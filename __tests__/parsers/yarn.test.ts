import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { parseYarnLockfile } from '../../src/parsers/yarn.js';

const here = dirname(fileURLToPath(import.meta.url));
const v1 = readFileSync(join(here, 'fixtures/yarn.v1.lock'), 'utf8');
const berry = readFileSync(join(here, 'fixtures/yarn.berry.lock'), 'utf8');

describe('parseYarnLockfile', () => {
	it('matches "yarn.lock" at any depth, rejects other formats', () => {
		expect(parseYarnLockfile.matches('yarn.lock')).toBe(true);
		expect(parseYarnLockfile.matches('apps/web/yarn.lock')).toBe(true);
		expect(parseYarnLockfile.matches('package-lock.json')).toBe(false);
		expect(parseYarnLockfile.matches('pnpm-lock.yaml')).toBe(false);
	});

	describe('v1 (classic)', () => {
		const lock = parseYarnLockfile.parse(v1);

		it('normalizes each package with bare name, version, and source key', () => {
			expect(lock.packages['is-odd@3.0.1']).toEqual({
				name: 'is-odd',
				version: '3.0.1',
				sourceKey: 'is-odd@3.0.1',
			});
			expect(lock.packages['is-number@6.0.0']).toEqual({
				name: 'is-number',
				version: '6.0.0',
				sourceKey: 'is-number@6.0.0',
			});
			expect(lock.packages['kind-of@6.0.3']).toEqual({
				name: 'kind-of',
				version: '6.0.3',
				sourceKey: 'kind-of@6.0.3',
			});
		});

		it('handles scoped package names', () => {
			expect(lock.packages['@sindresorhus/is@5.6.0']).toEqual({
				name: '@sindresorhus/is',
				version: '5.6.0',
				sourceKey: '@sindresorhus/is@5.6.0',
			});
		});

		it('parses every entry in the fixture', () => {
			expect(Object.keys(lock.packages)).toHaveLength(4);
		});
	});

	describe('berry (v2+)', () => {
		const lock = parseYarnLockfile.parse(berry);

		it('normalizes each package with bare name, version, and source key', () => {
			expect(lock.packages['is-odd@3.0.1']).toEqual({
				name: 'is-odd',
				version: '3.0.1',
				sourceKey: 'is-odd@3.0.1',
			});
			expect(lock.packages['@sindresorhus/is@5.6.0']).toEqual({
				name: '@sindresorhus/is',
				version: '5.6.0',
				sourceKey: '@sindresorhus/is@5.6.0',
			});
		});

		it('skips the __metadata block', () => {
			expect(lock.packages['__metadata@8']).toBeUndefined();
			expect(Object.keys(lock.packages).some((key) => key.startsWith('__metadata'))).toBe(false);
		});

		it('parses every entry in the fixture', () => {
			expect(Object.keys(lock.packages)).toHaveLength(4);
		});
	});
});
