import { diff, print } from './index.js';
import { parseNpmLockfile } from './formats/npm.js';
import { parseBunLockfile } from './formats/bun.js';
import type { LockfileAdapter, NormalizedLockfile } from './formats/types.js';
import type { Format } from './renderers/types.js';
import type { LockfileSource } from './sources/types.js';

/** Every lockfile format the pipeline knows how to parse. */
const adapters: LockfileAdapter[] = [parseNpmLockfile, parseBunLockfile];

/** A lockfile with no packages — the shape used for a side that is absent. */
const EMPTY_LOCKFILE: NormalizedLockfile = { packages: {} };

/** Find the adapter that handles `filename`, if any. */
function adapterFor(filename: string): LockfileAdapter | undefined {
  return adapters.find((a) => a.matches(filename));
}

/** Options driving how changed lockfiles are diffed and rendered. */
export interface DiffOptions {
  format: Format;
  color: boolean;
  shallow: boolean;
}

/**
 * Diff every changed lockfile between two refs and print the result.
 *
 * `source` is the only I/O seam: it discovers changed paths and reads file
 * contents at a ref. Pass a git-backed source in production, or a fake in
 * tests. Non-lockfile paths returned by `listChanged` are skipped via the
 * adapters' `matches` check.
 */
export async function diffChangedLockfiles(
  source: LockfileSource,
  from: string,
  to: string,
  options: DiffOptions,
): Promise<void> {
  const files = await source.listChanged(from, to);
  for (const filename of files) {
    const adapter = adapterFor(filename);
    if (!adapter) continue;

    const [oldContent, newContent] = await Promise.all([
      source.read(from, filename),
      source.read(to, filename),
    ]);
    // A side that is `null` (the file was added or removed between refs) is
    // diffed as an empty lockfile, so every package shows as added or removed.
    const changes = diff(
      oldContent === null ? EMPTY_LOCKFILE : adapter.parse(filename, oldContent),
      newContent === null ? EMPTY_LOCKFILE : adapter.parse(filename, newContent),
      options.shallow,
    );

    print(changes, {
      color: options.color,
      format: options.format,
      title: filename,
    });
  }
}
