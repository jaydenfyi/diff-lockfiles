import { parse as jsoncParse } from 'jsonc-parser';

/**
 * Parse JSONC (JSON with comments and trailing commas). Uses a string-aware
 * parser so that `//` inside string values (e.g. registry URLs, integrity
 * hashes) is not mistaken for a comment. Trailing commas are tolerated.
 */
export function parseJsonc(text: string): unknown {
  // jsonc-parser returns the parsed value and tolerates JSONC quirks; we ignore
  // the optional diagnostics array (bun.lock is always well-formed JSONC).
  return jsoncParse(text);
}
