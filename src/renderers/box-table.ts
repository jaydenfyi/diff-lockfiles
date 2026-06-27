/**
 * Render a 2D string matrix as a "honeywell"-bordered box table — the exact
 * output shape the `table` package produced for diff-lockfiles (verified
 * byte-identical against `table@6.9.0` defaults). Replaces a ~3.6M dependency
 * subtree (`table` → `ajv` → `fast-uri` + friends) with ~50 lines.
 *
 * Contract (hardcoded — diff-lockfiles needs no config surface):
 *   - left-aligned cells, 1 space of padding on each side
 *   - a separator line between every adjacent row pair
 *   - every line terminated with `\n` (including the last)
 *
 * Width model: ANSI escape codes are stripped before measuring, then width is
 * the Unicode code-point count. This matches `string-width` for all realistic
 * diff-lockfiles data (ASCII versions, `↑`, `—`, `@scope/pkg`); it diverges
 * only for CJK/emoji (width 2), which never appear in package names/versions.
 * Full East-Asian-width tables are deliberately omitted — they would re-import
 * the bloat this module exists to remove.
 *
 * Precondition: every cell is single-line (no `\n`) and `rows` is non-empty.
 * diff-lockfiles' cells (package names, versions, labels, lockfile paths) never
 * contain newlines, and the table renderer always passes title + header + rows.
 */

// Match ANSI SGR escape sequences (`\x1b[31m`, `\x1b[39m`, `\x1b[1m`, `\x1b[22m`). Built
// from the escape char rather than a regex literal so eslint's `no-control-regex`
// stays happy (the regex itself never appears in source with a control char).
const ANSI = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g');

/** Visible width of a cell: ANSI codes stripped, then code-point count. */
function cellWidth(cell: string): number {
	return [...cell.replace(ANSI, '')].length;
}

/** Pad a cell to its column's visible width: 1-space gutters, content verbatim. */
function padCell(cell: string, width: number): string {
	return ` ${cell}${' '.repeat(width - cellWidth(cell))} `;
}

/** Horizontal border line: `body` glyph repeated per column, joined by `join`. */
function borderLine(
	widths: number[],
	body: string,
	join: string,
	left: string,
	right: string,
): string {
	return left + widths.map((w) => body.repeat(w + 2)).join(join) + right;
}

/**
 * Render `rows` as a boxed table. See module doc for the full contract.
 */
export function renderBoxTable(rows: string[][]): string {
	const cols = rows[0]?.length ?? 0;
	const widths = Array.from({ length: cols }, (_, c) =>
		Math.max(...rows.map((row) => cellWidth(row[c] ?? ''))),
	);

	const top = borderLine(widths, '═', '╤', '╔', '╗');
	const separator = borderLine(widths, '─', '┼', '╟', '╢');
	const bottom = borderLine(widths, '═', '╧', '╚', '╝');

	const lines: string[] = [top];
	rows.forEach((row, index) => {
		lines.push('║' + row.map((cell, c) => padCell(cell, widths[c])).join('│') + '║');
		if (index < rows.length - 1) lines.push(separator);
	});
	lines.push(bottom);

	return lines.map((line) => line + '\n').join('');
}
