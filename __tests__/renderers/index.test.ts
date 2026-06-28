import { describe, it, expect } from 'vitest';
import { json, text, table, markdown } from '../../src/renderers/index.js';
import { lockfiles } from '../helpers.js';

const factories = { json, text, table, markdown };
const sample = lockfiles({ 'package-lock.json': { lodash: ['4.17.20', '4.17.21'] } });

describe('renderer factories', () => {
	it.each(Object.keys(factories))('%s() returns a renderer with a render() method', (key) => {
		const r = factories[key as keyof typeof factories]();
		expect(typeof r.render).toBe('function');
	});

	it('each factory renders the sample diffs to a non-empty string', () => {
		for (const factory of Object.values(factories)) {
			const out = factory().render(sample, { color: false });
			expect(typeof out).toBe('string');
			expect(out.length).toBeGreaterThan(0);
			expect(out).toContain('lodash');
		}
	});

	it('markdown render is pure (no color side effects; returns the table)', () => {
		const out = markdown().render(sample, { color: false });
		expect(out).toContain('## package-lock.json');
		expect(out).toContain('4.17.20');
		expect(out).toContain('4.17.21');
	});
});
