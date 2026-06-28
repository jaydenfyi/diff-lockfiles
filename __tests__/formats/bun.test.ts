import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { parseBunLockfile } from '../../src/formats/bun.js';

const here = dirname(fileURLToPath(import.meta.url));
const fixture = readFileSync(join(here, 'fixtures/bun.lock.jsonc'), 'utf8');
const wsFixture = readFileSync(join(here, 'fixtures/bun.workspaces.lock.jsonc'), 'utf8');

describe('parseBunLockfile', () => {
	const lock = parseBunLockfile.parse(fixture);

	it('matches "bun.lock"', () => {
		expect(parseBunLockfile.matches('bun.lock')).toBe(true);
		expect(parseBunLockfile.matches('package-lock.json')).toBe(false);
	});

	it('normalizes each package with bare name, version, and source key', () => {
		expect(lock.packages['express']).toEqual({
			name: 'express',
			version: '4.18.2',
			sourceKey: 'express',
		});
		expect(lock.packages['accepts']).toEqual({
			name: 'accepts',
			version: '1.3.8',
			sourceKey: 'accepts',
		});
	});

	it('handles scoped names with two "@" characters', () => {
		expect(lock.packages['@types/node']).toEqual({
			name: '@types/node',
			version: '20.0.0',
			sourceKey: '@types/node',
		});
	});

	it('tolerates JSONC comments and trailing commas', () => {
		// fixture contains both; if parsing succeeded we already pass
		expect(Object.keys(lock.packages)).toHaveLength(3);
	});
});

describe('parseBunLockfile (multi-workspace)', () => {
	// Real bun.lock from a 3-workspace monorepo (see
	// `fixtures/bun.workspaces.lock.jsonc`).
	const lock = parseBunLockfile.parse(wsFixture);

	it('drops workspace self/cross-references (workspace: versions)', () => {
		// These resolve to `name@workspace:<path>`: repo-local packages, not
		// registry deps. A workspace path rename must never surface as a bump.
		expect(lock.packages['@monorepo/util']).toBeUndefined();
		expect(lock.packages['@monorepo/rtl-validation']).toBeUndefined();
	});
});
