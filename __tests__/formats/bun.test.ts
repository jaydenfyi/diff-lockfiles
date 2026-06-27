import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { parseBunLockfile } from '../../src/formats/bun.js';

const here = dirname(fileURLToPath(import.meta.url));
const fixture = readFileSync(join(here, 'fixtures/bun.lock.jsonc'), 'utf8');

describe('parseBunLockfile', () => {
	const lock = parseBunLockfile.parse('bun.lock', fixture);

	it('matches "bun.lock"', () => {
		expect(parseBunLockfile.matches('bun.lock')).toBe(true);
		expect(parseBunLockfile.matches('package-lock.json')).toBe(false);
	});

	it('normalizes each package with bare name, version, source key, and directness', () => {
		expect(lock.packages['express']).toEqual({
			name: 'express',
			version: '4.18.2',
			sourceKey: 'express',
			direct: true,
		});
		expect(lock.packages['accepts']).toEqual({
			name: 'accepts',
			version: '1.3.8',
			sourceKey: 'accepts',
			direct: false,
		});
	});

	it('handles scoped names with two "@" characters', () => {
		expect(lock.packages['@types/node']).toEqual({
			name: '@types/node',
			version: '20.0.0',
			sourceKey: '@types/node',
			direct: true,
		});
	});

	it('marks packages available for shallow filtering when a root workspace exists', () => {
		expect(lock.directDependencyInfoAvailable).toBe(true);
	});

	it('tolerates JSONC comments and trailing commas', () => {
		// fixture contains both; if parsing succeeded we already pass
		expect(Object.keys(lock.packages)).toHaveLength(3);
	});
});
