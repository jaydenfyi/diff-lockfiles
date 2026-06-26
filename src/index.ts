// This is a fork of <https://github.com/mxweaver/lock-diff>
import type { Changes } from './changes.js';
import { renderers } from './renderers/registry.js';
import type { Format, RenderOptions } from './renderers/types.js';

/** Public API: the pure diff function. */
export { diff } from './diff.js';
/** Public API types. */
export type { Changes } from './changes.js';
export type { NormalizedLockfile } from './diff.js';
export type { Format, RenderOptions, Renderer } from './renderers/types.js';

/** Options for `print`. Extends `RenderOptions` with the format to select. */
export interface PrintOptions extends RenderOptions {
  format: Format;
}

/**
 * Render `changes` in the selected format and write them to stdout.
 *
 * Thin wrapper over the renderer registry: look up the renderer for the format,
 * ask it for a string, and `console.log` it (skipping the log entirely when the
 * renderer returns an empty string, e.g. the text renderer with no changes).
 */
export function print(changes: Changes, options: PrintOptions): void {
  const output = renderers[options.format].render(changes, {
    color: options.color,
    title: options.title,
  });
  if (output !== '') {
    console.log(output);
  }
}
