/**
 * Tiny ANSI color helper — a drop-in replacement for the three chalk functions
 * this project actually uses (`red`, `green`, `bold`).
 *
 * Unlike chalk, there is no automatic TTY / `FORCE_COLOR` detection: the `enabled`
 * flag passed to {@link createColors} is the single, explicit switch. When
 * `enabled` is false every function is a noop that returns its input unchanged;
 * when true it wraps the input in the same ANSI escape sequences chalk emits
 * (verified byte-identical at chalk levels 1 and 3):
 *
 *   red   -> `\x1b[31m` ... `\x1b[39m`
 *   green -> `\x1b[32m` ... `\x1b[39m`
 *   bold  -> `\x1b[1m`  ... `\x1b[22m`
 *
 * Inputs are coerced to string (via interpolation), matching chalk (e.g. `null` -> `"null"`).
 */

/** The subset of color/style functions the renderers use. */
export interface Colors {
  red: (text: string | null) => string;
  green: (text: string | null) => string;
  bold: (text: string | null) => string;
}

const ESC = '\x1b[';

/**
 * Build a set of color functions. When `enabled` is false, each function is a
 * noop returning its (string-coerced) input; when true it wraps the input with
 * ANSI open/close codes.
 */
export function createColors(enabled: boolean): Colors {
  /** Wrap `text` in `open`/`close` ANSI codes, or pass it through when disabled. */
  const style =
    (open: string, close: string): ((text: string | null) => string) =>
    (text) =>
      enabled ? `${ESC}${open}m${text}${ESC}${close}m` : `${text}`;

  return {
    red: style('31', '39'),
    green: style('32', '39'),
    bold: style('1', '22'),
  };
}
