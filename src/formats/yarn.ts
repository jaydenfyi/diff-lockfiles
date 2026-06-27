import type { NormalizedLockfile, LockfileAdapter } from './types.js';
import { splitNameVersion } from './types.js';

interface YarnEntry {
  /** Raw descriptor strings (quotes stripped): `name@range` or `name@protocol:range`. */
  descriptors: string[];
  version: string;
}

/**
 * Parse yarn.lock (v1 classic + berry v2+) into a flat list of entries.
 *
 * Both dialects are line-oriented and 2-space-indented. A top-level line
 * ending with `:` starts an entry; its keys are comma-joined before the
 * colon. We scan forward for the `version` field (indent >= 1) until the
 * next indent-0 line. We do NOT need to fully parse nested `dependencies:`
 * maps — version-diffing only needs the top-level keys + version.
 *
 * v1 field:   `  version "4.6.3"`    (space-separated, quoted value)
 * berry field: `  version: 4.6.3`     (colon-separated, may be bare)
 */
function parseEntries(content: string): YarnEntry[] {
  const entries: YarnEntry[] = [];
  const lines = content.split('\n');
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const stripped = line.trimStart();
    if (stripped === '' || stripped.startsWith('#')) { i++; continue; }
    const indent = line.length - stripped.length;
    if (indent !== 0 || !stripped.endsWith(':')) { i++; continue; }

    // Top-level key line. Strip the trailing colon, split on commas,
    // strip surrounding quotes from each descriptor.
    const keyStr = stripped.slice(0, -1).trim();
    const descriptors = keyStr
      .split(/,\s*/)
      .map((d) => d.replace(/^"|"$/g, '').trim())
      .filter(Boolean);

    // Scan forward for the version field, stopping at the next indent-0 line.
    // Only the FIRST `version` match counts: the real `version` field always
    // sits at the entry's top field level (before any nested `dependencies:`
    // map), so taking the first one avoids mistaking a transitive dep that
    // happens to be named `version` (nested at a deeper indent) for it.
    let version = '';
    i++;
    while (i < lines.length) {
      const l = lines[i];
      const s = l.trimStart();
      if (s === '' || s.startsWith('#')) { i++; continue; }
      if ((l.length - s.length) === 0) break; // next entry
      if (version === '') {
        // v1 field:   `  version "4.6.3"`    (space-separated, quoted value)
        // berry field: `  version: 4.6.3`     (colon-separated, may be bare)
        const m = s.match(/^version(?::\s*|\s+)"?([^"\s]+?)"?\s*$/);
        if (m) version = m[1];
      }
      i++;
    }
    entries.push({ descriptors, version });
  }
  return entries;
}

/**
 * yarn.lock (v1 classic and berry v2+) share a custom line-oriented format.
 * Entries have comma-merged descriptors sharing one resolved `version`.
 *
 * NOTE: yarn.lock contains no root-manifest / direct-dependency info, so
 * `directDependencyKeys` is always `undefined`. `--shallow` mode therefore
 * degrades to "show everything, all classified transitive" for yarn.
 */
export const parseYarnLockfile: LockfileAdapter = {
  matches(filename: string): boolean {
    return filename === 'yarn.lock' || filename.endsWith('/yarn.lock');
  },

  parse(_filename: string, content: string): NormalizedLockfile {
    const packages: NormalizedLockfile['packages'] = {};
    for (const { descriptors, version } of parseEntries(content)) {
      if (descriptors.length === 0 || !version) continue;
      // Skip the berry __metadata block (its "version" is the format version).
      if (descriptors[0] === '__metadata') continue;
      // Use the first descriptor's name; key as name@version.
      const name = splitNameVersion(descriptors[0])[0];
      const key = `${name}@${version}`;
      // Multiple descriptors share one entry; don't overwrite if seen.
      if (!packages[key]) packages[key] = { version };
    }
    return { packages };
  },
};
