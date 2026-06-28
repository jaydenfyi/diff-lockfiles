/**
 * One package in its display-normalized form. `name` is the bare package name
 * shown to humans (`lodash`, `@scope/pkg`); `sourceKey` is the original
 * lockfile key/path kept only for provenance and disambiguation.
 */
export interface NormalizedPackage {
	/** Bare package name shown to humans: lodash, @scope/pkg. */
	name: string;
	/** Raw resolved version/specifier. */
	version: string;
	/** Original key/path from the lockfile; used only for provenance/disambiguation. */
	sourceKey: string;
}

/**
 * Format-agnostic lockfile. `packages` is keyed by the original lockfile
 * `sourceKey` (preserving collisions-free provenance) and maps to fully
 * normalized package metadata.
 */
export interface NormalizedLockfile {
	packages: Record<string, NormalizedPackage>;
}

/** Each lockfile format implements this. `matches` detects the format by filename (CLI dispatch); `parse` takes content only. */
export interface LockfileParser {
	/** true if this parser handles the given filename */
	matches(filename: string): boolean;
	/** parse raw file content into the normalized shape (content only — filename is irrelevant to parsing) */
	parse(content: string): NormalizedLockfile;
}

/**
 * Split a `name@version` key/descriptor into its [name, version] halves.
 * Scoped names (`@scope/name@1.2.3`) start with '@', so the leading '@' is
 * skipped before searching for the '@' that separates name from version.
 * Shared by the bun, pnpm, and yarn adapters, which all key packages as
 * `name@version`. Returns `[specifier, '']` when no separator is present.
 */
export function splitNameVersion(specifier: string): [name: string, version: string] {
	const start = specifier.startsWith('@') ? 1 : 0;
	const at = specifier.indexOf('@', start);
	return at === -1 ? [specifier, ''] : [specifier.slice(0, at), specifier.slice(at + 1)];
}

/**
 * Derive the bare package name from an npm `node_modules/...` source key. Takes
 * the package name after the LAST `node_modules/` segment, keeping a scoped
 * name (`@scope/pkg`) together. Returns `''` for the root entry (`""`).
 *
 * Examples:
 *   `node_modules/express`                         -> `express`
 *   `node_modules/@scope/pkg`                      -> `@scope/pkg`
 *   `node_modules/foo/node_modules/@scope/pkg`     -> `@scope/pkg`
 */
export function packageNameFromNodeModulesPath(sourceKey: string): string {
	if (sourceKey === '') return '';
	const marker = 'node_modules/';
	const index = sourceKey.lastIndexOf(marker);
	const tail = index === -1 ? sourceKey : sourceKey.slice(index + marker.length);
	const [first, second] = tail.split('/');
	return first?.startsWith('@') && second ? `${first}/${second}` : first;
}
