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

    // Root dependency ranges live in workspaces[""] (the package-lock "packages['']" equivalent).
    const root = raw.workspaces?.[''];
    // bun.lock hoisted-dep keys are the bare package names.
    const directNames = new Set(
      root ? DEPENDENCY_FIELDS.flatMap((kind) => Object.keys(root[kind] ?? {})) : [],
    );

    const packages: NormalizedLockfile['packages'] = {};
    for (const [key, value] of Object.entries(raw.packages ?? {})) {
      // The array element carries `name@version`; the bare name comes from it,
      // not the map key (which may be workspace-namespaced, e.g. `b/left-pad`).
      const specifier = Array.isArray(value) && typeof value[0] === 'string' ? value[0] : key;
      const [name, version] = splitNameVersion(specifier);
      // When the map key carries only the bare name (no version), prefer it as
      // the provenance-preserving source key and the display name.
      packages[key] = {
        name: name || key,
        version,
        sourceKey: key,
        direct: directNames.has(name || key),
      };
    }

    return { packages, directDependencyInfoAvailable: Boolean(root) };
  },
};
