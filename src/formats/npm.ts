import type { NormalizedLockfile, LockfileAdapter } from './types.js';
import { DEPENDENCY_FIELDS, packageNameFromNodeModulesPath } from './types.js';

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

		// Manifests are the project's own package.jsons: root "" plus every
		// workspace dir (any key NOT under node_modules/). Each manifest's
		// dependency fields declare first-party (direct) deps. Matching on the
		// bare name (not the full node_modules path) is intentionally broader
		// than the old root-only behavior: a workspace's direct dep, or a direct
		// dep forced nested by a version conflict, is still "direct".
		const directNames = new Set(
			Object.entries(rawPackages)
				.filter(([key]) => key === '' || !key.includes('node_modules/'))
				.flatMap(([, entry]) =>
					DEPENDENCY_FIELDS.flatMap((kind) =>
						Object.keys((entry[kind] as Record<string, unknown> | undefined) ?? {}),
					),
				),
		);

		const packages: NormalizedLockfile['packages'] = {};
		for (const [sourceKey, entry] of Object.entries(rawPackages)) {
			// Skip workspace manifest entries (e.g. "packages/foo"): they are the
			// project's own manifests, not installed deps. Without this they'd
			// leak as a bogus package named after the parent dir. Root "" is kept
			// (its empty name is filtered downstream as before). A key is a
			// manifest iff it contains no `node_modules/` segment anywhere — nested
			// installs like `apps/b/node_modules/left-pad` DO contain it and must
			// be kept.
			if (sourceKey !== '' && !sourceKey.includes('node_modules/')) continue;
			// Skip workspace symlinks: they carry `link: true` and have no real
			// version (installed packages never set `link`).
			if (entry.link) continue;
			packages[sourceKey] = {
				name: packageNameFromNodeModulesPath(sourceKey),
				version: entry.version,
				sourceKey,
				direct: directNames.has(packageNameFromNodeModulesPath(sourceKey)),
			};
		}

		return { packages, directDependencyInfoAvailable: Boolean(rawPackages['']) };
	},
};
