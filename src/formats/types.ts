/**
 * Format-agnostic lockfile. `packages` is the map diff() consumes.
 * `directDependencyKeys` lists the package keys that are direct deps of the
 * root project; used only for `--shallow` mode. It is optional, so a plain
 * `{ packages }` object is also assignable to this type.
 */
export interface NormalizedLockfile {
  packages: Record<string, { version: string }>;
  directDependencyKeys?: string[];
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
