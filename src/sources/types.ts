/**
 * A source of file contents at git refs.
 *
 * This is the seam that decouples the diff pipeline from HOW files are read.
 * The production implementation talks to git (`createGitSource`); tests pass a
 * fake returning canned content, so the whole discover → parse → diff → render
 * pipeline can be exercised with zero git on disk.
 *
 * The source is intentionally format-agnostic: it does not know what a
 * "lockfile" is. `listChanged` returns every changed path between two refs;
 * the pipeline decides which of those it cares about (via the lockfile
 * adapters' `matches`). Keeping that knowledge out of the source removes the
 * duplicated filename pattern that used to live in both the adapters and a
 * `grep` filter inside the CLI.
 */
export interface LockfileSource {
  /** Paths that changed between `from` and `to` (any files, not just lockfiles). */
  listChanged(from: string, to: string): Promise<string[]>;
  /**
   * Full contents of `filename` as it exists at `ref`, or `null` when the path
   * is absent at that ref. `null` lets the pipeline diff a lockfile that was
   * added or removed between the two refs (every package shows as added or
   * removed) instead of crashing on the missing side.
   */
  read(ref: string, filename: string): Promise<string | null>;
}
