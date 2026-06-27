#!/usr/bin/env node

import { createRequire } from 'node:module';
import { Command } from 'commander';
import { diffChangedLockfiles } from './pipeline.js';
import { createGitSource, DEFAULT_MAX_BUFFER } from './sources/git.js';
import { renderers } from './renderers/registry.js';
import type { Format } from './renderers/types.js';

// Read the version from package.json at runtime so it stays in sync with the
// release instead of being a hand-maintained literal that silently drifts.
const { version } = createRequire(import.meta.url)('../package.json');

const cli = new Command();
cli
	.command('diff-lockfiles')
	.description('diff all changed lockfiles (npm, bun, pnpm, yarn, aube) in the repo')
	.version(version)
	.arguments('<from> <to>')
	.option('-f, --format <format>', 'changes the output format (table|json|markdown|text)', 'table')
	.option(
		'-m, --max-buffer <size>',
		'maximum read buffer size (bytes)',
		(value: string) => Number(value),
		DEFAULT_MAX_BUFFER,
	)
	.option('-c, --color', 'colorizes certain output formats', false)
	.option('-s, --shallow', 'only include direct dependencies of the project', false)
	.action(
		async (
			from: string,
			to: string,
			options: { format: string; maxBuffer: number; color: boolean; shallow: boolean },
		) => {
			// `Format` is the single source of truth; narrow commander's string here.
			// Unknown formats fall back to 'text' (matching the original switch default).
			const format: Format = options.format in renderers ? (options.format as Format) : 'text';
			const source = createGitSource({ maxBuffer: options.maxBuffer });
			await diffChangedLockfiles(source, from, to, {
				format,
				color: options.color,
				shallow: options.shallow,
			});
		},
	)
	.parse();
