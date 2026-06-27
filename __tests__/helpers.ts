import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bumpOf, classify, parseVersion } from '../src/changes.js';
import type { Change, Scope, Version } from '../src/changes.js';
import type { NormalizedPackage } from '../src/formats/types.js';
import type { LockfileDiffs } from '../src/renderers/types.js';

/** Build a {@link NormalizedPackage} for inline lockfile fixtures in tests. */
export function makePackage(
	name: string,
	version: string,
	sourceKey: string = `${name}@${version}`,
	direct = false,
): NormalizedPackage {
	return { name, version, sourceKey, direct };
}

/**
 * Build a {@link Change} carrying bare name + provenance source keys. The
 * default source keys are `name@version`; pass `oldSourceKey`/`newSourceKey`
 * for provenance/disambiguation tests.
 */
export function changeEntry(
	name: string,
	oldVersion: string | null,
	newVersion: string | null,
	options: {
		oldSourceKey?: string | null;
		newSourceKey?: string | null;
		direct?: boolean;
		scope?: Scope;
	} = {},
): Change {
	const oldV: Version | null = oldVersion === null ? null : parseVersion(oldVersion);
	const newV: Version | null = newVersion === null ? null : parseVersion(newVersion);
	return {
		name,
		oldSourceKey: options.oldSourceKey ?? (oldVersion === null ? null : `${name}@${oldVersion}`),
		newSourceKey: options.newSourceKey ?? (newVersion === null ? null : `${name}@${newVersion}`),
		kind: classify(oldV, newV),
		oldVersion: oldV,
		newVersion: newV,
		bump: bumpOf(oldV, newV),
		scope: options.scope ?? (options.direct ? 'direct' : 'transitive'),
	};
}

/**
 * Build a flat {@link Change} array from `name -> [old, new]` tuples, so
 * renderer tests stay readable while constructing real Change objects.
 */
export function changes(entries: Record<string, [string | null, string | null]>): Change[] {
	return Object.entries(entries).map(([name, [oldVersion, newVersion]]) =>
		changeEntry(name, oldVersion, newVersion),
	);
}

/**
 * Build a {@link LockfileDiffs} array from `lockfile -> { name -> [old, new] }`,
 * so multi-lockfile renderer tests stay readable while constructing real data.
 */
export function lockfiles(
	entries: Record<string, Record<string, [string | null, string | null]>>,
): LockfileDiffs {
	return Object.entries(entries).map(([lockfile, changesMap]) => ({
		lockfile,
		changes: changes(changesMap),
	}));
}

// --- Multi-version fixture loading (shared by pipeline + snapshot tests) ---

const here = dirname(fileURLToPath(import.meta.url));
const multiVersionDir = join(here, 'fixtures', 'multi-version');

/** File extension for each manager's committed lockfile fixtures. */
const FIXTURE_EXT: Record<string, string> = {
	npm: '.json',
	bun: '.lock',
	pnpm: '.yaml',
	yarn: '.lock',
	aube: '.yaml',
};

/** The lockfile managers with committed multi-version fixtures. */
export const FIXTURE_MANAGERS = Object.keys(FIXTURE_EXT) as readonly string[];

/** The lockfile filename each manager uses (its committed fixture's name). */
export const FIXTURE_FILENAME: Record<string, string> = {
	npm: 'package-lock.json',
	bun: 'bun.lock',
	pnpm: 'pnpm-lock.yaml',
	yarn: 'yarn.lock',
	aube: 'aube-lock.yaml',
};

/**
 * Read a multi-version fixture lockfile from disk (see
 * `fixtures/multi-version/README.md`). These are real, package-manager-
 * generated lockfiles committed as static files for offline, deterministic
 * tests of genuine duplicate/triplicate package resolution.
 */
export function loadFixture(manager: string, scenario: string): string {
	return readFileSync(join(multiVersionDir, manager, `${scenario}${FIXTURE_EXT[manager]}`), 'utf8');
}
