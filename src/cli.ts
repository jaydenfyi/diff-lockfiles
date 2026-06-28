#!/usr/bin/env node

import { createRequire } from 'node:module';
import { Command } from 'commander';
import { diffLockfiles } from './index.js';
import { diffGitRefs } from './sources/index.js';
import { DEFAULT_MAX_BUFFER } from './sources/git.js';
import { json, text, table, markdown } from './renderers/index.js';
import type { Format, Renderer } from './renderers/types.js';

// Read the version from package.json at runtime so it stays in sync with the
// release instead of being a hand-maintained literal that silently drifts.
const { version } = createRequire(import.meta.url)('../package.json');

// The four built-in renderers, keyed by the --format id. Renderers are called
// directly (no central registry). Unknown ids fall back to `text` below.
const builtinRenderers: Record<Format, Renderer> = {
	json: json(),
	text: text(),
	table: table(),
	markdown: markdown(),
};

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
	.action(
		async (
			from: string,
			to: string,
			options: { format: string; maxBuffer: number; color: boolean },
		) => {
			// Unknown format → fall back to 'text' (preserving prior CLI behavior).
			const renderer =
				(options.format in builtinRenderers
					? builtinRenderers[options.format as Format]
					: undefined) ?? builtinRenderers.text;
			// The pre-built singleton has all five parsers registered; the CLI is
			// the batteries-included path, so it uses it as-is.
			const diffs = await diffGitRefs(diffLockfiles, from, to, { maxBuffer: options.maxBuffer });
			if (diffs.length === 0) return;
			const output = renderer.render(diffs, { color: options.color });
			if (output !== '') console.log(output);
		},
	)
	.parse();
