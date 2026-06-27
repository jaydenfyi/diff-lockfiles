import { parsePnpmContent } from './pnpm.js';
import type { NormalizedLockfile, LockfileAdapter } from './types.js';

/**
 * aube-lock.yaml uses the exact same on-disk format as pnpm-lock.yaml v9
 * (aube reuses pnpm's parser/writer internally), so this adapter delegates
 * to {@link parsePnpmContent}. Only `matches()` differs: it accepts
 * `aube-lock.yaml` plus the branch-lockfile variant `aube-lock.<branch>.yaml`
 * (pnpm-style `/` encoded as `!`).
 */
export const parseAubeLockfile: LockfileAdapter = {
	matches(filename: string): boolean {
		const base = filename.includes('/') ? filename.slice(filename.lastIndexOf('/') + 1) : filename;
		return base === 'aube-lock.yaml' || /^aube-lock\..+\.yaml$/.test(base);
	},
	parse(_filename: string, content: string): NormalizedLockfile {
		return parsePnpmContent(content);
	},
};
