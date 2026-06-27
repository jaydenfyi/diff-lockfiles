import { markdownRenderer } from '../../src/renderers/markdown.js';
import { changeEntry, lockfiles } from '../helpers.js';
import type { LockfileDiffs, RenderOptions } from '../../src/renderers/types.js';

const options: RenderOptions = { color: false };

describe('markdownRenderer', () => {
	it('renders an H2 per lockfile, each followed by its table', () => {
		const out = markdownRenderer.render(
			lockfiles({
				'apps/api/bun.lock': { express: ['4.18.0', '4.19.0'] },
				'package-lock.json': { lodash: [null, '4.17.21'] },
			}),
			options,
		);
		expect(out).toContain('## apps/api/bun.lock');
		expect(out).toContain('## package-lock.json');
		// A blank line separates the first table from the next heading (was missing).
		expect(out).toMatch(/\|\n\n## package-lock\.json/);
	});

	it('renders only the header row for a lockfile with no changes', () => {
		// (Pipeline filters empties, so this is defensive; keep the behavior sane.)
		const out = markdownRenderer.render(lockfiles({ 'a.lock': {} }), options);
		expect(out).toContain('## a.lock');
		expect(out).toContain('| Package');
	});

	it('emits an empty string for an empty run', () => {
		expect(markdownRenderer.render([], options)).toBe('');
	});

	it('adds source-key disambiguators to the Package cell for duplicate rows', () => {
		const data: LockfileDiffs = [
			{
				lockfile: 'package-lock.json',
				changes: [
					changeEntry('lodash', '4.17.21', null, {
						oldSourceKey: 'node_modules/foo/node_modules/lodash',
					}),
					changeEntry('lodash', '4.17.21', null, {
						oldSourceKey: 'node_modules/bar/node_modules/lodash',
					}),
				],
			},
		];
		const out = markdownRenderer.render(data, options);
		expect(out).toContain('lodash (node_modules/foo/node_modules/lodash)');
		expect(out).toContain('lodash (node_modules/bar/node_modules/lodash)');
	});
});
