import { diff } from '../src/diff.js';
import { renderers } from '../src/renderers/registry.js';
import { parseAubeLockfile } from '../src/formats/aube.js';
import { parseBunLockfile } from '../src/formats/bun.js';
import { parseNpmLockfile } from '../src/formats/npm.js';
import { parsePnpmLockfile } from '../src/formats/pnpm.js';
import { parseYarnLockfile } from '../src/formats/yarn.js';
import type { LockfileAdapter } from '../src/formats/types.js';
import type { Format, LockfileDiffs } from '../src/renderers/types.js';
import { FIXTURE_FILENAME, FIXTURE_MANAGERS, loadFixture } from './helpers.js';

/**
 * Snapshot tests over the real, package-manager-generated multi-version
 * fixtures (see `fixtures/multi-version/README.md`). For every manager x
 * scenario x format, the full rendered output is pinned.
 *
 * These complement pipeline.test.ts (which asserts substrings/structure) by
 * locking the EXACT output: headers, row order, box-drawing, indentation, and
 * the full JSON wire format. Cross-manager snapshots sharing an identical body
 * is itself the assertion that every parser yields one consistent bare-name
 * view (the headline goal of the refactor).
 *
 * Update snapshots after an intentional rendering change: `npx vitest -u`.
 * Always review the diff in `__tests__/snapshots/__snapshots__/` before
 * accepting it.
 */

// Each manager paired with its parser. Filenames come from the shared fixture
// map so there is a single source of truth for the committed fixture layout.
const PARSERS: Record<string, LockfileAdapter> = {
	npm: parseNpmLockfile,
	bun: parseBunLockfile,
	pnpm: parsePnpmLockfile,
	yarn: parseYarnLockfile,
	aube: parseAubeLockfile,
};

const SCENARIOS = ['pair', 'fallback'] as const;
const FORMATS: readonly Format[] = ['text', 'table', 'markdown', 'json'];

/**
 * Build the {@link LockfileDiffs} for one fixture scenario, mirroring exactly
 * what the pipeline computes: parse both sides, diff, and wrap
 * with the lockfile's filename. Renders stay pure — no console, no async.
 */
function fixtureDiffs(manager: string, scenario: string): LockfileDiffs {
	const filename = FIXTURE_FILENAME[manager];
	const parse = PARSERS[manager].parse;
	const oldLock = parse(filename, loadFixture(manager, `${scenario}-old`));
	const newLock = parse(filename, loadFixture(manager, `${scenario}-new`));
	return [{ lockfile: filename, changes: diff(oldLock, newLock) }];
}

describe('fixture render snapshots', () => {
	describe.each(FORMATS)('%s format', (format) => {
		describe.each(SCENARIOS)('%s scenario', (scenario) => {
			it.each(FIXTURE_MANAGERS)('%s', (manager) => {
				const out = renderers[format].render(fixtureDiffs(manager, scenario), {
					color: false,
				});
				expect(out).toMatchSnapshot();
			});
		});
	});
});
