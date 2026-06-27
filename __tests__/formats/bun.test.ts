import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { parseBunLockfile } from '../../src/formats/bun.js';

const here = dirname(fileURLToPath(import.meta.url));
const fixture = readFileSync(join(here, 'fixtures/bun.lock.jsonc'), 'utf8');
const wsFixture = readFileSync(join(here, 'fixtures/bun.workspaces.lock.jsonc'), 'utf8');

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

describe('parseBunLockfile (multi-workspace)', () => {
	// Real bun.lock from a 3-workspace monorepo (see
	// `fixtures/bun.workspaces.lock.jsonc`). Root declares `is-even`, the
	// `packages/util` workspace declares `@sinclair/typebox`, and
	// `packages/rtl-validation` declares `left-pad`. `is-even` pulls a transitive
	// chain (is-odd -> is-number -> kind-of -> is-buffer) that no workspace
	// declares, giving a clean direct/transitive split.
	const lock = parseBunLockfile.parse('bun.lock', wsFixture);

	it('marks deps declared in any workspace as direct (not just root)', () => {
		// Declared in the root workspace ("").
		expect(lock.packages['is-even'].direct).toBe(true);
		// Declared in a NON-root workspace — the bug this fixes.
		expect(lock.packages['@sinclair/typebox'].direct).toBe(true); // packages/util
		expect(lock.packages['left-pad'].direct).toBe(true); // packages/rtl-validation
	});

	it('keeps genuinely transitive deps as transitive', () => {
		// Pulled in transitively via is-even's dependency chain; declared by no
		// workspace, so they must stay transitive.
		expect(lock.packages['is-odd'].direct).toBe(false);
		expect(lock.packages['is-number'].direct).toBe(false);
		expect(lock.packages['kind-of'].direct).toBe(false);
		expect(lock.packages['is-buffer'].direct).toBe(false);
	});

	it('drops workspace self/cross-references (workspace: versions)', () => {
		// These resolve to `name@workspace:<path>`: repo-local packages, not
		// registry deps. A workspace path rename must never surface as a bump.
		expect(lock.packages['@monorepo/util']).toBeUndefined();
		expect(lock.packages['@monorepo/rtl-validation']).toBeUndefined();
	});

	it('flags direct info available when any workspace manifest is present', () => {
		expect(lock.directDependencyInfoAvailable).toBe(true);
	});
});
