import { parseNpmLockfile } from './npm.js';
import { parseBunLockfile } from './bun.js';
import { parsePnpmLockfile } from './pnpm.js';
import { parseYarnLockfile } from './yarn.js';
import { parseAubeLockfile } from './aube.js';
import type { LockfileAdapter } from './types.js';

/** Public API: one factory per supported lockfile format. Each returns the
 *  existing adapter object as-is (currently a trivial passthrough); the factory
 *  shape is the future-config hook (e.g. `npm({ includeManifests: false })`)
 *  without a later breaking change. */
export const npm = () => parseNpmLockfile;
export const bun = () => parseBunLockfile;
export const pnpm = () => parsePnpmLockfile;
export const yarn = () => parseYarnLockfile;
export const aube = () => parseAubeLockfile;

/** All five built-in format adapters, frozen and spread-only. Mutating a shared
 *  module singleton is unsupported — always spread: `[...defaultFormats, custom()]`. */
export const defaultFormats: ReadonlyArray<LockfileAdapter> = Object.freeze([
	npm(),
	bun(),
	pnpm(),
	yarn(),
	aube(),
]);

export type { LockfileAdapter, NormalizedLockfile, NormalizedPackage } from './types.js';
