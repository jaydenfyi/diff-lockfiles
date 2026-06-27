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
		const selfPackage = rawPackages[''];

		// Each direct dependency of the root project lives at `node_modules/<name>`.
		// (The root "" entry itself is not a direct dependency and is filtered out
		// downstream because its bare name is empty.)
		const directSourceKeys = selfPackage
			? new Set(
					DEPENDENCY_FIELDS.flatMap((kind) =>
						Object.keys((selfPackage[kind] as Record<string, unknown> | undefined) ?? {}).map(
							(name) => `node_modules/${name}`,
						),
					),
				)
			: new Set<string>();

		const packages: NormalizedLockfile['packages'] = {};
		for (const [sourceKey, entry] of Object.entries(rawPackages)) {
			packages[sourceKey] = {
				name: packageNameFromNodeModulesPath(sourceKey),
				version: entry.version,
				sourceKey,
				direct: directSourceKeys.has(sourceKey),
			};
		}

		return { packages, directDependencyInfoAvailable: Boolean(selfPackage) };
	},
};
