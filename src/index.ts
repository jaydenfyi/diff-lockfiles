import { renderers } from './renderers/registry.js';
import type { Format, RenderOptions, LockfileDiffs } from './renderers/types.js';

/** Public API: the pure diff function. */
export { diff } from './diff.js';
/** Public API: the version parser. */
export { parseVersion } from './changes.js';
/** Public API types. */
export type { Changes, Change, ChangeKind, Version, Bump, Scope } from './changes.js';
export type { NormalizedLockfile } from './diff.js';
export type { Format, RenderOptions, Renderer, LockfileDiff, LockfileDiffs } from './renderers/types.js';

/** Options for `print`. Extends `RenderOptions` with the format to select. */
export interface PrintOptions extends RenderOptions {
  format: Format;
}

/**
 * Render a full run's lockfile diffs in the selected format and write the single
 * resulting document to stdout. Emits nothing when `lockfiles` is empty (nothing
 * changed) or when the renderer returns an empty string.
 */
export function print(lockfiles: LockfileDiffs, options: PrintOptions): void {
  if (lockfiles.length === 0) return;
  const output = renderers[options.format].render(lockfiles, { color: options.color });
  if (output !== '') {
    console.log(output);
  }
}
