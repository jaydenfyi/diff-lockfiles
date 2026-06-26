#!/usr/bin/env node

import { Command } from 'commander';
import { diffChangedLockfiles } from './pipeline.js';
import { createGitSource } from './sources/git.js';
import { renderers } from './renderers/registry.js';
import type { Format } from './renderers/types.js';

const version = '1.0.2';

const cli = new Command();
cli
  .command('diff-lockfiles')
  .description('diff all changed package-lock.json and bun.lock files in repo')
  .version(version)
  .arguments('<from> <to>')
  .option('-f, --format <format>', 'changes the output format (table|json|markdown|text)', 'table')
  .option('-m, --max-buffer <size>', 'maximum read buffer size (bytes)', (value: string) => Number(value), 1024 * 10000)
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
