#!/usr/bin/env node

import { Command } from 'commander';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { diff, print } from './index.js';

const execPromise = promisify(exec);
const version = '1.0.2';

async function lockFiles(a: string, b: string): Promise<string[]> {
  const output = await execPromise(
    `git diff ${a} ${b} --name-only | grep 'package-lock.json$'`,
  );
  const lines = output.stdout;
  const list = lines.trim().split(/\r\n|\r|\n/);
  return list;
}

async function lockFileString(maxBuffer: number, branch: string, filename: string): Promise<string> {
  const output = await execPromise(`git show ${branch}:${filename}`, { maxBuffer });
  const lines = output.stdout.trim();
  if (output.stderr.trim() !== '') {
    console.error(output.stderr.trim());
  }
  return lines;
}

const cli = new Command();
cli
  .command('diff-lockfiles')
  .description('diff all changed package-lock.json files in repo')
  .version(version)
  .arguments('<from> <to>')
  .option('-f, --format <format>', 'changes the output format (table|json|markdown|text)', 'table')
  .option('-m, --max-buffer', 'maximum read buffer size', 1024 * 10000 as unknown as boolean)
  .option('-c, --color', 'colorizes certain output formats', false)
  .option('-s, --shallow', 'only include direct dependencies of the project', false)
  .action((from: string, to: string, options: { format: string; maxBuffer: number; color: boolean; shallow: boolean }) => {
    void lockFiles(from, to).then((v) => {
      for (const filename of v) {
        const a = lockFileString(options.maxBuffer, from, filename).then((s) => JSON.parse(s));
        const b = lockFileString(options.maxBuffer, to, filename).then((s) => JSON.parse(s));
        void Promise.all([a, b]).then((values) => {
          const changes = diff(values[0], values[1], options.shallow);
          print(changes, {
            color: options.color,
            format: options.format as 'json' | 'table' | 'markdown' | 'text',
            title: filename,
          });
        });
      }
    });
  })
  .parse();
