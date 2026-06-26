import type { Changes } from '../changes.js';

/**
 * Output format identifiers. This is the single source of truth for the format
 * contract — both `PrintOptions` (public API) and the CLI import it from here,
 * so the set of formats can no longer drift between modules.
 */
export type Format = 'json' | 'table' | 'markdown' | 'text';

/**
 * Options every renderer accepts. `color` toggles ANSI coloring (where the
 * format supports it); `title` labels the output (used by table/markdown).
 */
export interface RenderOptions {
  color: boolean;
  title: string;
}

/**
 * A renderer turns a `Changes` map into an output string.
 *
 * Renderers must be **pure**: no console, no I/O. The caller decides what to do
 * with the returned string. Returning an empty string means "emit nothing"
 * (e.g. the text renderer with no changes).
 */
export interface Renderer {
  render(changes: Changes, options: RenderOptions): string;
}
