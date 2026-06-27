import { parseAllDocuments } from 'yaml';
import type { NormalizedLockfile, LockfileAdapter } from './types.js';
import { splitNameVersion } from './types.js';

/**
 * Parse pnpm-lock.yaml / aube-lock.yaml v9 content into the normalized
 * shape. Exported standalone so the aube adapter can reuse it without a
 * factory — both adapters are plain `LockfileAdapter` objects (matching
 * npm.ts / bun.ts), differing only in their `matches()`.
 *
 * pnpm v9 keys `packages:` by `name@version` (the version lives in the
 * key; there is no `version` field inside the entry). pnpm 11 may emit a
 * second `---`-separated "env lockfile" document; we read only the first
 * via `parseAll()[0]`.
 */
export function parsePnpmContent(content: string): NormalizedLockfile {
	const doc = parseAllDocuments(content)[0]?.toJS() as
		| { packages?: Record<string, unknown> }
		| null
		| undefined;
	if (!doc || typeof doc !== 'object') return { packages: {} };

	const packages: NormalizedLockfile['packages'] = {};
	for (const key of Object.keys(doc.packages ?? {})) {
		const [name, version] = splitNameVersion(key);
		packages[key] = { name, version, sourceKey: key };
	}
	return { packages };
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
