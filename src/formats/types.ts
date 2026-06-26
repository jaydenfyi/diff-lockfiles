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
