import type { NormalizedLockfile, LockfileAdapter } from './types.js';
import { DEPENDENCY_FIELDS } from './types.js';

/**
 * package-lock.json v2/v3 uses a top-level `packages` map keyed by node_modules
 * path (root at ""). Each entry has a `version` field, so this is a near-passthrough.
 */
export const parseNpmLockfile: LockfileAdapter = {
  matches(filename: string): boolean {
    return filename === 'package-lock.json' || filename.endsWith('/package-lock.json');
  },

  parse(_filename: string, content: string): NormalizedLockfile {
    const raw = JSON.parse(content) as {
      packages: Record<string, { version: string } & Record<string, unknown>>;
    };
    const packages = raw.packages ?? {};
    const selfPackage = packages[''];

    // Root entry key "" plus each direct dependency's node_modules path.
    const directDependencyKeys = selfPackage
      ? [
          ...new Set([
            '',
            ...DEPENDENCY_FIELDS.flatMap((kind) =>
              Object.keys((selfPackage[kind] as Record<string, unknown> | undefined) ?? {}).map(
                (name) => `node_modules/${name}`,
              ),
            ),
          ]),
        ]
      : undefined;

    return { packages, directDependencyKeys };
  },
};
