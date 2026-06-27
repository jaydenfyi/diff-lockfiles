/**
 * One package in its display-normalized form. `name` is the bare package name
 * shown to humans (`lodash`, `@scope/pkg`); `sourceKey` is the original
 * lockfile key/path kept only for provenance and disambiguation. `direct` is
 * whether this package is directly referenced by the root project.
 */
export interface NormalizedPackage {
	/** Bare package name shown to humans: lodash, @scope/pkg. */
	name: string;
	/** Raw resolved version/specifier. */
	version: string;
	/** Original key/path from the lockfile; used only for provenance/disambiguation. */
	sourceKey: string;
	/** Whether this package is directly referenced by the supported direct-dependency source. */
	direct: boolean;
}

/**
 * Format-agnostic lockfile. `packages` is keyed by the original lockfile
 * `sourceKey` (preserving collisions-free provenance) and maps to fully
 * normalized package metadata. `directDependencyInfoAvailable` signals whether
 * this format can identify direct deps from the lockfile alone; when false
 * (e.g. yarn), `--shallow` degrades to "show everything". It is optional, so a
 * plain `{ packages }` object is also assignable to this type.
 */
export interface NormalizedLockfile {
	packages: Record<string, NormalizedPackage>;
	/** false for formats such as yarn where lockfile alone cannot identify direct deps. */
	directDependencyInfoAvailable?: boolean;
}

/** Each format implements this. `filename` is used to detect the format in the CLI. */
export interface LockfileAdapter {
	/** true if this adapter handles the given filename */
	matches(filename: string): boolean;
	/** parse raw file content into the normalized shape */
	parse(filename: string, content: string): NormalizedLockfile;
}

/** The four npm dependency-map field names, shared by every lockfile format. */
export const DEPENDENCY_FIELDS = [
	'dependencies',
	'devDependencies',
	'optionalDependencies',
	'peerDependencies',
] as const;

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
