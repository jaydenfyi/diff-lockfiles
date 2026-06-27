import type { Changes } from '../changes.js';

/**
 * Output format identifiers. Single source of truth for the format contract —
 * both `PrintOptions` (public API) and the CLI import `Format` from here, so the
 * set of formats cannot drift between modules.
 */
export type Format = 'json' | 'table' | 'markdown' | 'text';

/**
 * Options every renderer accepts. `color` toggles ANSI coloring (where the
 * format supports it). Identity (which lockfile) lives on each
 * {@link LockfileDiff} entry, not here.
 */
export interface RenderOptions {
	color: boolean;
}

/**
 * One lockfile's diff result, paired with the filename/workspace path that
 * identifies it. `lockfile` is exactly the path `git diff --name-only` reported
 * (e.g. `package-lock.json` or `apps/api/bun.lock`).
 */
export interface LockfileDiff {
	lockfile: string;
	changes: Changes;
}

/** A complete run's worth of diffs, in git's changed-file order. */
export type LockfileDiffs = LockfileDiff[];

/**
 * A renderer turns a full run's {@link LockfileDiffs} into one output string.
 *
 * Renderers must be **pure**: no console, no I/O. Returning an empty string
 * means "emit nothing". Identity is per-entry (`lockfile`), so every renderer
 * can label its output regardless of format.
 */
export interface Renderer {
	render(lockfiles: LockfileDiffs, options: RenderOptions): string;
}
