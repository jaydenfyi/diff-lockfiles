import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { parseAubeLockfile } from '../../src/formats/aube.js';

const here = dirname(fileURLToPath(import.meta.url));
const fixture = readFileSync(join(here, 'fixtures/aube-lock.yaml'), 'utf8');

describe('parseAubeLockfile', () => {
	const lock = parseAubeLockfile.parse('aube-lock.yaml', fixture);

	it('matches "aube-lock.yaml" and branch variants, rejects other formats', () => {
		expect(parseAubeLockfile.matches('aube-lock.yaml')).toBe(true);
		expect(parseAubeLockfile.matches('apps/web/aube-lock.yaml')).toBe(true);
		expect(parseAubeLockfile.matches('aube-lock.feature!x.yaml')).toBe(true);
		expect(parseAubeLockfile.matches('pnpm-lock.yaml')).toBe(false);
		expect(parseAubeLockfile.matches('package-lock.json')).toBe(false);
	});

	it('parses identically to the pnpm adapter (same on-disk format)', () => {
		expect(lock.packages['is-even@1.0.0']).toEqual({
			name: 'is-even',
			version: '1.0.0',
			sourceKey: 'is-even@1.0.0',
			direct: true,
		});
		expect(lock.packages['is-odd@3.0.1']).toEqual({
			name: 'is-odd',
			version: '3.0.1',
			sourceKey: 'is-odd@3.0.1',
			direct: true,
		});
		expect(Object.keys(lock.packages)).toHaveLength(7);
	});

	it('marks direct-dependency info available (shared pnpm format)', () => {
		expect(lock.directDependencyInfoAvailable).toBe(true);
	});
});
