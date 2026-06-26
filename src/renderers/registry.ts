import type { Format, Renderer } from './types.js';
import { jsonRenderer } from './json.js';
import { textRenderer } from './text.js';
import { tableRenderer } from './table.js';
import { markdownRenderer } from './markdown.js';

/**
 * Registry of format id -> Renderer. `Format` (in types.ts) is the single
 * source of truth for the keys, so `Record<Format, Renderer>` gives an
 * exhaustiveness check: adding a format means one new renderer module plus one
 * line here plus one member of the `Format` union, and the compiler flags
 * anything missed.
 */
export const renderers: Record<Format, Renderer> = {
  json: jsonRenderer,
  text: textRenderer,
  table: tableRenderer,
  markdown: markdownRenderer,
};
