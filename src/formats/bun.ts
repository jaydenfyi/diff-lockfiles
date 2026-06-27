import { parse as jsoncParse } from 'jsonc-parser';
import type { NormalizedLockfile, LockfileAdapter } from './types.js';
import { DEPENDENCY_FIELDS, splitNameVersion } from './types.js';

interface BunLockfile {
	lockfileVersion: number;
	workspaces?: Record<string, BunWorkspace>;
	packages?: Record<string, unknown[]>;
}

interface BunWorkspace {
	name?: string;
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
	optionalDependencies?: Record<string, string>;
	peerDependencies?: Record<string, string>;
}

export const parseBunLockfile: LockfileAdapter = {
	matches(filename: string): boolean {
		return filename === 'bun.lock' || filename.endsWith('/bun.lock');
	},

	parse(_filename: string, content: string): NormalizedLockfile {
		// jsonc-parser is string-aware: `//` inside string values (registry URLs,
		// integrity hashes) is not mistaken for a comment. Trailing commas tolerated.
		const raw = jsoncParse(content) as BunLockfile;

		// Direct deps are declared in the manifest of the root OR any workspace
		// package. bun.lock keys `workspaces` by path ("" = root,
		// "packages/<ws>" = workspace); each carries its own dependency maps. A
		// workspace is a real package with its own package.json, so its declared
		// deps are first-party (direct), not transitive pulls.
		const workspaces = raw.workspaces ?? {};
		const directNames = new Set(
			Object.values(workspaces).flatMap((ws) =>
				DEPENDENCY_FIELDS.flatMap((kind) => Object.keys(ws[kind] ?? {})),
			),
		);

		const packages: NormalizedLockfile['packages'] = {};
		for (const [key, value] of Object.entries(raw.packages ?? {})) {
			// The array element carries `name@version`; the bare name comes from it,
			// not the map key (which may be workspace-namespaced, e.g. `b/left-pad`).
			const specifier = Array.isArray(value) && typeof value[0] === 'string' ? value[0] : key;
			const [name, version] = splitNameVersion(specifier);
			// Workspace self/cross-references resolve to "name@workspace:<path>".
			// They are repo-local packages, not registry deps — drop them so a
			// workspace path rename never surfaces as a version bump.
			if (version.startsWith('workspace:')) continue;
			// When the map key carries only the bare name (no version), prefer it as
			// the provenance-preserving source key and the display name.
			packages[key] = {
				name: name || key,
				version,
				sourceKey: key,
				direct: directNames.has(name || key),
			};
		}

		return { packages, directDependencyInfoAvailable: Object.keys(workspaces).length > 0 };
	},
};
