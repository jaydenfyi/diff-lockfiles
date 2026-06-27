import { parseAllDocuments } from 'yaml';
import type { NormalizedLockfile, LockfileAdapter } from './types.js';
import { DEPENDENCY_FIELDS, splitNameVersion } from './types.js';

interface PnpmImporterDep {
	specifier?: string;
	version?: string;
}

interface PnpmImporter {
	dependencies?: Record<string, PnpmImporterDep>;
	devDependencies?: Record<string, PnpmImporterDep>;
	optionalDependencies?: Record<string, PnpmImporterDep>;
	peerDependencies?: Record<string, PnpmImporterDep>;
}

interface PnpmLockfile {
	lockfileVersion?: string;
	importers?: Record<string, PnpmImporter>;
	packages?: Record<string, unknown>;
}

/**
 * Strip a trailing peer-context suffix from a resolved version:
 * `1.2.1(typescript@5.3.3)` -> `1.2.1`. Workspace/file deps resolve to
 * `link:...` and have no `packages:` entry, so they're filtered out by
 * the caller.
 */
function stripPeerSuffix(version: string): string {
	const paren = version.indexOf('(');
	return paren === -1 ? version : version.slice(0, paren);
}

/**
 * Parse pnpm-lock.yaml / aube-lock.yaml v9 content into the normalized
 * shape. Exported standalone so the aube adapter can reuse it without a
 * factory — both adapters are plain `LockfileAdapter` objects (matching
 * npm.ts / bun.ts), differing only in their `matches()`.
 *
 * pnpm v9 keys `packages:` by `name@version` (the version lives in the
 * key; there is no `version` field inside the entry). Direct deps live in
 * `importers['.']`. pnpm 11 may emit a second `---`-separated "env
 * lockfile" document; we read only the first via `parseAll()[0]`.
 */
export function parsePnpmContent(content: string): NormalizedLockfile {
	const doc = parseAllDocuments(content)[0]?.toJS() as PnpmLockfile | null | undefined;
	if (!doc || typeof doc !== 'object')
		return { packages: {}, directDependencyInfoAvailable: false };

	// Reconstruct `name@version` direct-dep keys from importers so they line
	// up with the `packages:` keys for the `direct` flag. Direct deps come from
	// the manifest of the root OR any workspace package: pnpm keys `importers`
	// by path ("." = root, "packages/<ws>" = workspace), and each workspace is a
	// real package whose declared deps are first-party (direct). Drop
	// `link:...` (workspace/file) resolutions, which have no packages entry.
	const importers = doc.importers ?? {};
	const directSourceKeys = new Set(
		Object.values(importers).flatMap((importer) =>
			DEPENDENCY_FIELDS.flatMap((kind) =>
				Object.entries(importer[kind] ?? {})
					.map(([name, dependency]): string | undefined => {
						const version = dependency.version ? stripPeerSuffix(dependency.version) : '';
						return version && !version.startsWith('link:') ? `${name}@${version}` : undefined;
					})
					.filter((value): value is string => value !== undefined),
			),
		),
	);

	const packages: NormalizedLockfile['packages'] = {};
	for (const key of Object.keys(doc.packages ?? {})) {
		const [name, version] = splitNameVersion(key);
		packages[key] = { name, version, sourceKey: key, direct: directSourceKeys.has(key) };
	}

	return { packages, directDependencyInfoAvailable: Object.keys(importers).length > 0 };
}

/** Adapter for `pnpm-lock.yaml` (pnpm 9/10/11). */
export const parsePnpmLockfile: LockfileAdapter = {
	matches(filename: string): boolean {
		return filename === 'pnpm-lock.yaml' || filename.endsWith('/pnpm-lock.yaml');
	},
	parse(_filename: string, content: string): NormalizedLockfile {
		return parsePnpmContent(content);
	},
};
