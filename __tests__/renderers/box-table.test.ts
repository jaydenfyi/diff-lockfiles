import { renderBoxTable } from '../../src/renderers/box-table.js';

describe('renderBoxTable', () => {
	it('renders a honeywell-bordered box, left-aligned, 1-space padded, with separators', () => {
		// Byte-exact match of `table([['a','bb'],['ccc','d']])` — the parity oracle.
		expect(
			renderBoxTable([
				['a', 'bb'],
				['ccc', 'd'],
			]),
		).toBe(
			['╔═════╤════╗', '║ a   │ bb ║', '╟─────┼────╢', '║ ccc │ d  ║', '╚═════╧════╝', ''].join(
				'\n',
			),
		);
	});

	it('sizes each column to its widest cell across all rows', () => {
		// Col 0 widens to 'package-lock.json' (17); shorter cells right-padded.
		const out = renderBoxTable([
			['package-lock.json', '1'],
			['x', '100'],
		]);
		expect(out).toContain('║ package-lock.json │ 1   ║');
		expect(out).toContain('║ x                 │ 100 ║');
		// Border segments match: col0 = 19 dashes, col1 = 5 dashes.
		expect(out).toContain('╔═══════════════════╤═════╗');
	});

	it('strips ANSI codes when measuring width (colored cells stay aligned)', () => {
		// A red 'a' must size the same as a plain 'a' (width 1), not 9.
		const red = '\x1b[31ma\x1b[39m';
		const out = renderBoxTable([
			[red, 'b'],
			['cc', 'd'],
		]);
		// Col 0 width = max(1, 2) = 2; col 1 width = max(1,1) = 1. The colored 'a'
		// pads to visible width 2; the ANSI codes render but don't affect sizing,
		// so the right border `║` still lines up with the plain `cc` row below.
		expect(out).toContain('║ \x1b[31ma\x1b[39m  │ b ║');
		expect(out).toContain('║ cc │ d ║');
		expect(out).toContain('╔════╤═══╗'); // col0 border 4, col1 border 3
	});

	it('counts ↑ and — as width 1 (matches string-width for our data)', () => {
		// ↑ (U+2191) and — (U+2014 em-dash) are the only non-ASCII chars in cells.
		expect(renderBoxTable([['↑ minor', '—']])).toBe(
			['╔═════════╤═══╗', '║ ↑ minor │ — ║', '╚═════════╧═══╝', ''].join('\n'),
		);
	});

	it('ends every line with a newline, including the last', () => {
		expect(renderBoxTable([['a']])).toBe('╔═══╗\n║ a ║\n╚═══╝\n');
	});

	it('draws a separator between every adjacent row pair (and only between)', () => {
		// 3 rows → 2 separators (title|header, header|data), none after the last.
		const out = renderBoxTable([['t'], ['h'], ['d']]);
		const sepCount = (out.match(/╟/g) ?? []).length;
		expect(sepCount).toBe(2);
		expect(out).not.toMatch(/╟─+╢\n╚/); // no separator immediately before the bottom border
	});

	it('handles empty-string cells (padded to column width)', () => {
		// Empty title cells in columns 1-3 must pad to the column's max width.
		expect(
			renderBoxTable([
				['lock', '', ''],
				['pkg', 'v', 'v'],
			]),
		).toBe(
			[
				'╔══════╤═══╤═══╗',
				'║ lock │   │   ║',
				'╟──────┼───┼───╢',
				'║ pkg  │ v │ v ║',
				'╚══════╧═══╧═══╝',
				'',
			].join('\n'),
		);
	});
});
