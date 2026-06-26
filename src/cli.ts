#!/usr/bin/env node

import { Command } from 'commander';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { diff, print } from './index.js';
import type { LockfileAdapter, NormalizedLockfile } from './formats/types.js';
import { parseNpmLockfile } from './formats/npm.js';
import { parseBunLockfile } from './formats/bun.js';

const execPromise = promisify(exec);
const version = '1.0.2';

const adapters: LockfileAdapter[] = [parseNpmLockfile, parseBunLockfile];

// ERE alternation uses a plain `|` (NOT `\|`, which matches a literal pipe).
const lockfilePattern = "'package-lock.json$|bun.lock$'";

function adapterFor(filename: string): LockfileAdapter | undefined {
  return adapters.find((a) => a.matches(filename));
}

async function changedLockFiles(from: string, to: string): Promise<string[]> {
  const output = await execPromise(
    `git diff ${from} ${to} --name-only | grep -E ${lockfilePattern}`,
  );
  return output.stdout.trim().split(/\r\n|\r|\n/).filter(Boolean);
}

async function lockFileString(maxBuffer: number, branch: string, filename: string): Promise<string> {
  const output = await execPromise(`git show ${branch}:${filename}`, { maxBuffer });
  if (output.stderr.trim() !== '') {
    console.error(output.stderr.trim());
  }
  return output.stdout.trim();
}

async function loadLockfile(
  maxBuffer: number,
  branch: string,
  filename: string,
): Promise<NormalizedLockfile | null> {
  const adapter = adapterFor(filename);
  if (!adapter) return null;
  const content = await lockFileString(maxBuffer, branch, filename);
  return adapter.parse(filename, content);
}

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
    (from: string, to: string, options: { format: string; maxBuffer: number; color: boolean; shallow: boolean }) => {
      void changedLockFiles(from, to).then(async (files) => {
        for (const filename of files) {
          if (!adapterFor(filename)) continue;
          const [oldLock, newLock] = await Promise.all([
            loadLockfile(options.maxBuffer, from, filename),
            loadLockfile(options.maxBuffer, to, filename),
          ]);
          if (!oldLock || !newLock) continue;
          const changes = diff(oldLock, newLock, options.shallow);
          print(changes, {
            color: options.color,
            format: options.format as 'json' | 'table' | 'markdown' | 'text',
            title: filename,
          });
        }
      });
    },
  )
  .parse();
