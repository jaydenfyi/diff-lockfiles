import { parse as jsoncParse } from 'jsonc-parser';
import type { NormalizedLockfile, LockfileParser } from './types.js';
import { splitNameVersion } from './types.js';

interface BunLockfile {
	lockfileVersion: number;
	packages?: Record<string, unknown[]>;
}

export const parseBunLockfile: LockfileParser = {
	matches(filename: string): boolean {
		return filename === 'bun.lock' || filename.endsWith('/bun.lock');
	},

	parse(content: string): NormalizedLockfile {
		// jsonc-parser is string-aware: `//` inside string values (registry URLs,
		// integrity hashes) is not mistaken for a comment. Trailing commas tolerated.
		const raw = jsoncParse(content) as BunLockfile;

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
			};
		}

		return { packages };
	},
};
