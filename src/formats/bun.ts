import { parse as jsoncParse } from 'jsonc-parser';
import type { NormalizedLockfile, LockfileAdapter } from './types.js';
import { DEPENDENCY_FIELDS } from './types.js';

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

/**
 * Extract the version specifier from a Bun "name@version" string.
 * Scoped names ("@scope/name@1.2.3") start with '@', so we skip that leading
 * '@' before searching for the '@' that separates name from version.
 */
export function extractVersion(specifier: string): string {
  const start = specifier.startsWith('@') ? 1 : 0;
  const at = specifier.indexOf('@', start);
  return at === -1 ? specifier : specifier.slice(at + 1);
}

export const parseBunLockfile: LockfileAdapter = {
  matches(filename: string): boolean {
    return filename === 'bun.lock' || filename.endsWith('/bun.lock');
  },

  parse(_filename: string, content: string): NormalizedLockfile {
    // jsonc-parser is string-aware: `//` inside string values (registry URLs,
    // integrity hashes) is not mistaken for a comment. Trailing commas tolerated.
    const raw = jsoncParse(content) as BunLockfile;

    const packages: NormalizedLockfile['packages'] = raw.packages
      ? Object.fromEntries(
          Object.entries(raw.packages).map(([key, value]) => {
            const specifier = Array.isArray(value) && typeof value[0] === 'string' ? value[0] : key;
            return [key, { version: extractVersion(specifier) }];
          }),
        )
      : {};

    // Root dependency ranges live in workspaces[""] (the package-lock "packages['']" equivalent).
    const root = raw.workspaces?.[''];
    // bun.lock hoisted-dep keys are the bare package names.
    const directDependencyKeys = root
      ? [...new Set(DEPENDENCY_FIELDS.flatMap((kind) => Object.keys(root[kind] ?? {})))]
      : undefined;

    return { packages, directDependencyKeys };
  },
};
