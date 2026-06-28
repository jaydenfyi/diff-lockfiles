import { describe, it, expect } from 'vitest';
import { npm, bun, pnpm, yarn, aube, defaultParsers } from '../../src/parsers/index.js';
import { loadFixture, FIXTURE_FILENAME } from '../helpers.js';

const factories = { npm, bun, pnpm, yarn, aube };

describe('format factories', () => {
	it.each(Object.keys(factories))('%s() returns a parser with matches+parse', (key) => {
		const parser = factories[key as keyof typeof factories]();
		expect(typeof parser.matches).toBe('function');
		expect(typeof parser.parse).toBe('function');
	});

	it('npm() matches package-lock.json (incl. nested workspace paths)', () => {
		expect(npm().matches('package-lock.json')).toBe(true);
		expect(npm().matches('apps/api/package-lock.json')).toBe(true);
		expect(npm().matches('bun.lock')).toBe(false);
	});

	it('each built-in factory matches its canonical filename', () => {
		expect(bun().matches(FIXTURE_FILENAME.bun)).toBe(true);
		expect(pnpm().matches(FIXTURE_FILENAME.pnpm)).toBe(true);
		expect(yarn().matches(FIXTURE_FILENAME.yarn)).toBe(true);
		expect(aube().matches(FIXTURE_FILENAME.aube)).toBe(true);
	});

	it('npm().parse parses a real fixture into a normalized lockfile', () => {
		const content = loadFixture('npm', 'pair-old');
		const lock = npm().parse(content);
		expect(Object.keys(lock.packages).length).toBeGreaterThan(0);
	});

	it('defaultParsers is a frozen array of 5 distinct parsers', () => {
		expect(Object.isFrozen(defaultParsers)).toBe(true);
		expect(defaultParsers).toHaveLength(5);
	});
});
