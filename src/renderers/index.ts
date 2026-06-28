import { jsonRenderer } from './json.js';
import { textRenderer } from './text.js';
import { tableRenderer } from './table.js';
import { markdownRenderer } from './markdown.js';

/** Public API: one factory per built-in renderer. Renderers are called directly
 *  (e.g. `markdown().render(diffs, { color })`) — there is no central registry
 *  and no `id` field. Factories are currently trivial passthroughs; the shape is
 *  the future-config hook for renderers that take options at construction. */
export const json = () => jsonRenderer;
export const text = () => textRenderer;
export const table = () => tableRenderer;
export const markdown = () => markdownRenderer;

export type { Renderer, RenderOptions, Format, LockfileDiff, LockfileDiffs } from './types.js';
