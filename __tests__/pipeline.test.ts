import { diffChangedLockfiles } from '../src/pipeline.js';
import type { LockfileSource } from '../src/sources/types.js';

// Minimal package-lock.json v2/v3 bodies. The root "" entry carries the
// project version (same in both → unchanged → filtered out), matching real
// package-lock.json structure; the one direct dep changes version.
const oldLock = JSON.stringify({
  packages: { '': { version: '1.0.0' }, 'node_modules/lodash': { version: '4.17.20' } },
});
const newLock = JSON.stringify({
  packages: { '': { version: '1.0.0' }, 'node_modules/lodash': { version: '4.17.21' } },
});

/** A fake source returning canned content by ref, plus a fixed "changed" list. */
function fakeSource(
  contentByRef: Record<string, Record<string, string>>,
  changed: string[],
): LockfileSource {
  return {
    async listChanged() {
      return changed;
    },
    async read(ref, filename) {
      // Missing ref/filename -> null (absent at that side), matching the git
      // source's contract for a lockfile added or removed between refs.
      return contentByRef[ref]?.[filename] ?? null;
    },
  };
}

/** Capture everything written to `console.log` while `fn` runs (always restores). */
async function captureLog(fn: () => Promise<unknown>): Promise<string[]> {
  const lines: string[] = [];
  const original = console.log;
  console.log = (...args: unknown[]) => lines.push(String(args[0]));
  try {
    await fn();
  } finally {
    console.log = original;
  }
  return lines;
}

describe('diffChangedLockfiles', () => {
  it('diffs a changed lockfile end-to-end with zero git', async () => {
    const source = fakeSource(
      { FROM: { 'package-lock.json': oldLock }, TO: { 'package-lock.json': newLock } },
      // Include a non-lockfile path to prove it is filtered out by the adapter.
      ['package-lock.json', 'README.md'],
    );

    const printed = await captureLog(() =>
      diffChangedLockfiles(source, 'FROM', 'TO', { format: 'text', color: false, shallow: false }),
    );

    expect(printed).toEqual(['node_modules/lodash 4.17.20 -> 4.17.21 patch · transitive']);
  });

  it('does nothing (and does not throw) when no lockfiles changed', async () => {
    const source = fakeSource({}, []);

    await expect(
      captureLog(() =>
        diffChangedLockfiles(source, 'a', 'b', { format: 'text', color: false, shallow: false }),
      ),
    ).resolves.toEqual([]);
  });

  it('treats a newly-added lockfile as fully added (no crash)', async () => {
    // The lockfile does not exist at FROM (added in TO). The source returns null
    // for the missing side; every package on the present side shows as added.
    const source = fakeSource(
      { TO: { 'package-lock.json': newLock } },
      ['package-lock.json'],
    );

    const printed = await captureLog(() =>
      diffChangedLockfiles(source, 'FROM', 'TO', { format: 'text', color: false, shallow: false }),
    );

    // The whole lockfile is new, so every entry — including the root "" project
    // entry carried by the fixture — shows as added (no crash). The root entry
    // is a direct dep (the npm adapter lists "" itself); lodash is transitive.
    expect(printed).toEqual([
      ' added 1.0.0 · direct\nnode_modules/lodash added 4.17.21 · transitive',
    ]);
  });

  it('treats a removed lockfile as fully removed (no crash)', async () => {
    // Symmetric: the lockfile exists only at FROM (removed in TO).
    const source = fakeSource(
      { FROM: { 'package-lock.json': oldLock } },
      ['package-lock.json'],
    );

    const printed = await captureLog(() =>
      diffChangedLockfiles(source, 'FROM', 'TO', { format: 'text', color: false, shallow: false }),
    );

    // Symmetric to the added case: every entry (including root "") is removed.
    expect(printed).toEqual([
      ' removed 1.0.0 · direct\nnode_modules/lodash removed 4.17.20 · transitive',
    ]);
  });
});

// Minimal valid lockfile bodies for every supported format, each containing a
// single package "x" at version 1.0.0. Used to prove each adapter is registered
// and reachable through the pipeline (a forgotten import would silently skip
// the format). Content lives only on the TO side, so the package shows as added.
const SINGLE_PACKAGE_LOCKFILES: Record<string, string> = {
  'package-lock.json': JSON.stringify({ packages: { 'node_modules/x': { version: '1.0.0' } } }),
  'bun.lock': JSON.stringify({ lockfileVersion: 0, packages: { x: ['x@1.0.0'] } }),
  'pnpm-lock.yaml': 'packages:\n  x@1.0.0:\n    resolution: {integrity: sha512-aaa=}\n',
  'aube-lock.yaml': 'packages:\n  x@1.0.0:\n    resolution: {integrity: sha512-aaa=}\n',
  'yarn.lock': 'x@^1.0.0:\n  version "1.0.0"\n',
};

describe('adapter registration', () => {
  it.each(Object.keys(SINGLE_PACKAGE_LOCKFILES))(
    'recognizes %s through the pipeline',
    async (filename) => {
      const source = fakeSource({ TO: { [filename]: SINGLE_PACKAGE_LOCKFILES[filename] } }, [
        filename,
      ]);

      const printed = await captureLog(() =>
        diffChangedLockfiles(source, 'FROM', 'TO', {
          format: 'text',
          color: false,
          shallow: false,
        }),
      );

      // A recognized format emits one render call whose body mentions the
      // package as added; an unregistered adapter would emit nothing at all.
      expect(printed).toHaveLength(1);
      expect(printed[0]).toMatch(/added/);
    },
  );

  it('silently skips an unrecognized filename', async () => {
    const source = fakeSource({ TO: { 'not-a-lockfile.txt': 'whatever' } }, ['not-a-lockfile.txt']);
    const printed = await captureLog(() =>
      diffChangedLockfiles(source, 'FROM', 'TO', { format: 'text', color: false, shallow: false }),
    );
    expect(printed).toEqual([]);
  });
});
