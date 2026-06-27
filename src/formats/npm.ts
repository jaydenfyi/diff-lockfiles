import type { NormalizedLockfile, LockfileAdapter } from './types.js';
import { declaredDepNames, packageNameFromNodeModulesPath } from './types.js';

/**
 * package-lock.json v2/v3 uses a top-level `packages` map keyed by node_modules
 * path (root at ""). Each entry has a `version` field; the bare package name is
 * derived from the path itself.
 */
export const parseNpmLockfile: LockfileAdapter = {
	matches(filename: string): boolean {
		return filename === 'package-lock.json' || filename.endsWith('/package-lock.json');
	},

	parse(_filename: string, content: string): NormalizedLockfile {
		const raw = JSON.parse(content) as {
			packages: Record<string, { version: string } & Record<string, unknown>>;
		};
		const rawPackages = raw.packages ?? {};

		// A key is one of the project's own manifests iff it contains no
		// `node_modules/` segment anywhere: the root `""` plus every workspace
		// dir (e.g. "packages/foo"). Nested installs like
		// "apps/b/node_modules/left-pad" DO contain it and are real packages.
		const isManifestKey = (key: string): boolean => key === '' || !key.includes('node_modules/');

		// Each manifest's dependency fields declare first-party (direct) deps.
		// Matching on the bare name (not the full node_modules path) is
		// intentionally broader than the old root-only behavior: a workspace's
		// direct dep, or a direct dep forced nested by a version conflict, is
		// still "direct". (pnpm differs: it keys packages by name@version, so a
		// non-declared version stays transitive there.)
		const manifests = Object.entries(rawPackages)
			.filter(([key]) => isManifestKey(key))
			.map(([, entry]) => entry);
		const directNames = declaredDepNames(manifests);

		const packages: NormalizedLockfile['packages'] = {};
		for (const [sourceKey, entry] of Object.entries(rawPackages)) {
			// Skip workspace manifest entries: the project's own manifests, not
			// installed deps (otherwise they'd leak as a bogus package named after
			// the parent dir). Root "" is kept — its empty name is filtered downstream.
			if (sourceKey !== '' && isManifestKey(sourceKey)) continue;
			// Skip local-linked entries: workspace symlinks AND file:/link: deps
			// all carry `link: true` with no real registry version, so they have no
			// meaningful version to diff. This mirrors pnpm (drops `link:`
			// resolutions) and bun (drops `workspace:` refs).
			if (entry.link) continue;
			packages[sourceKey] = {
				name: packageNameFromNodeModulesPath(sourceKey),
				version: entry.version,
				sourceKey,
				direct: directNames.has(packageNameFromNodeModulesPath(sourceKey)),
			};
		}

		return { packages, directDependencyInfoAvailable: manifests.length > 0 };
	},
};
