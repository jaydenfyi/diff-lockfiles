import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { parsePnpmLockfile } from '../../src/formats/pnpm.js';

const here = dirname(fileURLToPath(import.meta.url));
const fixture = readFileSync(join(here, 'fixtures/pnpm-lock.v9.yaml'), 'utf8');
const wsFixture = readFileSync(join(here, 'fixtures/pnpm-lock.workspaces.v9.yaml'), 'utf8');

describe('parsePnpmLockfile', () => {
	const lock = parsePnpmLockfile.parse('pnpm-lock.yaml', fixture);

	it('matches "pnpm-lock.yaml" at any depth, rejects other formats', () => {
		expect(parsePnpmLockfile.matches('pnpm-lock.yaml')).toBe(true);
		expect(parsePnpmLockfile.matches('apps/web/pnpm-lock.yaml')).toBe(true);
		expect(parsePnpmLockfile.matches('aube-lock.yaml')).toBe(false);
		expect(parsePnpmLockfile.matches('package-lock.json')).toBe(false);
		expect(parsePnpmLockfile.matches('yarn.lock')).toBe(false);
	});

	it('normalizes each package with bare name, version, and source key', () => {
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
		expect(lock.packages['is-number@3.0.0']).toEqual({
			name: 'is-number',
			version: '3.0.0',
			sourceKey: 'is-number@3.0.0',
			direct: false,
		});
	});

	it('keeps multiple versions of the same package as distinct keys', () => {
		expect(lock.packages['is-number@3.0.0']).toBeDefined();
		expect(lock.packages['is-number@6.0.0']).toBeDefined();
		expect(lock.packages['is-odd@0.1.2']).toBeDefined();
		expect(lock.packages['is-odd@3.0.1']).toBeDefined();
	});

	it('marks packages available for shallow filtering when importers["."] exists', () => {
		expect(lock.directDependencyInfoAvailable).toBe(true);
	});

	it('parses every package entry in packages:', () => {
		expect(Object.keys(lock.packages)).toHaveLength(7);
	});

	it('returns an empty packages map for unparseable input', () => {
		expect(parsePnpmLockfile.parse('pnpm-lock.yaml', '')).toEqual({
			packages: {},
			directDependencyInfoAvailable: false,
		});
		expect(parsePnpmLockfile.parse('pnpm-lock.yaml', 'not: valid: yaml: :')).toEqual({
			packages: {},
			directDependencyInfoAvailable: false,
		});
	});
});

describe('parsePnpmLockfile (multi-workspace)', () => {
	// Real pnpm-lock.yaml v9 from a 3-workspace monorepo (see
	// `fixtures/pnpm-lock.workspaces.v9.yaml`). The root importer `.` declares
	// `is-even`, the `packages/util` importer declares `@sinclair/typebox`, and
	// `packages/rtl-validation` declares `left-pad`. `is-even` pulls a transitive
	// chain (is-odd -> is-number -> kind-of -> is-buffer) that no importer
	// declares, giving a clean direct/transitive split.
	const lock = parsePnpmLockfile.parse('pnpm-lock.yaml', wsFixture);

	it('marks deps declared in any workspace importer as direct (not just root)', () => {
		// Declared in the root importer ".".
		expect(lock.packages['is-even@1.0.0'].direct).toBe(true);
		// Declared in a NON-root importer — the bug this fixes.
		expect(lock.packages['@sinclair/typebox@0.32.35'].direct).toBe(true); // packages/util
		expect(lock.packages['left-pad@1.3.0'].direct).toBe(true); // packages/rtl-validation
	});

	it('keeps genuinely transitive deps as transitive', () => {
		expect(lock.packages['is-odd@0.1.2'].direct).toBe(false);
		expect(lock.packages['is-number@3.0.0'].direct).toBe(false);
		expect(lock.packages['kind-of@3.2.2'].direct).toBe(false);
		expect(lock.packages['is-buffer@1.1.6'].direct).toBe(false);
	});

	it('flags direct info available with multiple importers present', () => {
		expect(lock.directDependencyInfoAvailable).toBe(true);
	});
});
