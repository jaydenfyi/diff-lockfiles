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

    const packages: NormalizedLockfile['packages'] = raw.packages
      ? Object.fromEntries(
          Object.entries(raw.packages).map(([key, value]) => {
            const specifier = Array.isArray(value) && typeof value[0] === 'string' ? value[0] : key;
            return [key, { version: splitNameVersion(specifier)[1] }];
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
