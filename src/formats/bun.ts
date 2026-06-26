import { parseJsonc } from './jsonc.js';
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
    const raw = parseJsonc(content) as BunLockfile;
    const packages: NormalizedLockfile['packages'] = {};

    if (raw.packages) {
      for (const [key, value] of Object.entries(raw.packages)) {
        const specifier = Array.isArray(value) && typeof value[0] === 'string' ? value[0] : key;
        packages[key] = { version: extractVersion(specifier) };
      }
    }

    // Root dependency ranges live in workspaces[""] (the package-lock "packages['']" equivalent).
    const root = raw.workspaces?.[''];
    let directDependencyKeys: string[] | undefined;
    if (root) {
      const depNames = new Set<string>();
      DEPENDENCY_FIELDS.forEach(
        (kind) => {
          Object.keys(root[kind] ?? {}).forEach((name) => depNames.add(name));
        },
      );
      // bun.lock hoisted-dep keys are the bare package names
      directDependencyKeys = [...depNames];
    }

    return { packages, directDependencyKeys };
  },
};
