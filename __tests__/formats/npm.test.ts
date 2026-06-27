import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { parseNpmLockfile } from '../../src/formats/npm.js';
import { packageNameFromNodeModulesPath } from '../../src/formats/types.js';

describe('packageNameFromNodeModulesPath', () => {
	it('returns the last segment after node_modules/', () => {
		expect(packageNameFromNodeModulesPath('node_modules/express')).toBe('express');
	});

	it('keeps a scoped name together', () => {
		expect(packageNameFromNodeModulesPath('node_modules/@scope/pkg')).toBe('@scope/pkg');
	});

	it('handles nested node_modules', () => {
		expect(packageNameFromNodeModulesPath('node_modules/foo/node_modules/bar')).toBe('bar');
		expect(packageNameFromNodeModulesPath('node_modules/foo/node_modules/@scope/pkg')).toBe(
			'@scope/pkg',
		);
	});

	it('returns an empty string for the root entry', () => {
		expect(packageNameFromNodeModulesPath('')).toBe('');
	});
});

const here = dirname(fileURLToPath(import.meta.url));
const fixture = readFileSync(join(here, 'fixtures/package-lock.v3.json'), 'utf8');
const wsFixture = readFileSync(join(here, 'fixtures/package-lock.workspaces.v3.json'), 'utf8');

describe('parseNpmLockfile', () => {
	const lock = parseNpmLockfile.parse('package-lock.json', fixture);

	it('matches "package-lock.json"', () => {
		expect(parseNpmLockfile.matches('package-lock.json')).toBe(true);
		expect(parseNpmLockfile.matches('bun.lock')).toBe(false);
	});

	it('normalizes each package with bare name, version, and source key', () => {
		expect(lock.packages['node_modules/express']).toEqual({
			name: 'express',
			version: '4.18.2',
			sourceKey: 'node_modules/express',
		});
		expect(lock.packages['node_modules/@types/node']).toEqual({
			name: '@types/node',
			version: '20.0.0',
			sourceKey: 'node_modules/@types/node',
		});
		expect(lock.packages['node_modules/accepts']).toEqual({
			name: 'accepts',
			version: '1.3.8',
			sourceKey: 'node_modules/accepts',
		});
	});

	it('derives bare names from nested node_modules paths', () => {
		const nested = parseNpmLockfile.parse(
			'package-lock.json',
			JSON.stringify({
				packages: {
					'': { dependencies: { foo: '^1.0.0' } },
					'node_modules/foo': { version: '1.0.0' },
					'node_modules/foo/node_modules/@scope/pkg': { version: '2.0.0' },
				},
			}),
		);
		expect(nested.packages['node_modules/foo/node_modules/@scope/pkg']).toEqual({
			name: '@scope/pkg',
			version: '2.0.0',
			sourceKey: 'node_modules/foo/node_modules/@scope/pkg',
		});
	});
});

describe('parseNpmLockfile (multi-workspace)', () => {
	// Real package-lock.json v3 from a 3-workspace monorepo (see
	// `fixtures/package-lock.workspaces.v3.json`).
	const lock = parseNpmLockfile.parse('package-lock.json', wsFixture);

	it('drops workspace manifest entries (no bogus package named after the dir)', () => {
		// `packages/util` and `packages/rtl-validation` are the project's own
		// manifests (keys with no `node_modules/` segment). They must not leak as
		// packages — previously they did, bogusly named after the parent dir.
		expect(lock.packages['packages/util']).toBeUndefined();
		expect(lock.packages['packages/rtl-validation']).toBeUndefined();
	});

	it('drops workspace symlinks (link:true, no real version)', () => {
		// Workspace packages are symlinked under node_modules/@monorepo/* with
		// `link: true` and no `version`. They are repo-local, not registry deps.
		expect(lock.packages['node_modules/@monorepo/util']).toBeUndefined();
		expect(lock.packages['node_modules/@monorepo/rtl-validation']).toBeUndefined();
	});

	it('drops ANY local-linked entry (file:/link: deps too, not only workspace symlinks)', () => {
		// npm marks every linked package with `link: true` — workspace symlinks
		// AND file:/link: deps — none of which carry a real registry version to
		// diff. This pins that policy so it is intentional rather than incidental
		// (and so a future change to workspace handling can't silently regress it).
		const fileDepLock = parseNpmLockfile.parse(
			'package-lock.json',
			JSON.stringify({
				packages: {
					'': { dependencies: { 'my-local-pkg': 'file:./local' } },
					'node_modules/my-local-pkg': { link: true, resolved: 'file:./local' },
					'node_modules/express': { version: '4.18.2' },
				},
			}),
		);
		expect(fileDepLock.packages['node_modules/my-local-pkg']).toBeUndefined();
		// A real registry dep is unaffected.
		expect(fileDepLock.packages['node_modules/express']).toBeDefined();
	});
});
