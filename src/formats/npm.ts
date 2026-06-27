import type { NormalizedLockfile, LockfileAdapter } from './types.js';
import { packageNameFromNodeModulesPath } from './types.js';

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
		// `node_modules/` segment: the root "" plus every workspace dir. These are
		// the project's own package.json files, not installed deps — skip them.
		const isManifestKey = (key: string): boolean => key === '' || !key.includes('node_modules/');

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
			};
		}

		return { packages };
	},
};
