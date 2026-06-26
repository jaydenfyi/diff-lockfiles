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
      return contentByRef[ref]?.[filename] ?? '';
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

    expect(printed).toEqual(['node_modules/lodash 4.17.20 -> 4.17.21']);
  });

  it('does nothing (and does not throw) when no lockfiles changed', async () => {
    const source = fakeSource({}, []);

    await expect(
      captureLog(() =>
        diffChangedLockfiles(source, 'a', 'b', { format: 'text', color: false, shallow: false }),
      ),
    ).resolves.toEqual([]);
  });
});
