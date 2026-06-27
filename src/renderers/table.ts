import { table } from 'table';
import { createColor } from '../colors.js';
import { changeLabel } from './change-label.js';
import { highlightVersion } from './highlight.js';
import { packageLabels } from './display-name.js';
import type { Changes } from '../changes.js';
import type { Renderer } from './types.js';

/** One boxed table for a single lockfile, titled by its filename/path. */
function renderTable(
	lockfile: string,
	changes: Changes,
	color: ReturnType<typeof createColor>,
): string {
	const labels = packageLabels(changes);
	const rows = changes.map((change, index) => {
		const { kind, oldVersion, newVersion, bump, scope } = change;
		const name = labels[index];
		const oldCell = highlightVersion(oldVersion, bump, color);
		const newCell = highlightVersion(newVersion, bump, color);
		const cell = changeLabel(kind, bump);
		if (kind === 'upgrade') {
			return [name, color.red(oldCell), color.green(newCell), cell, scope];
		}
		if (kind === 'downgrade') {
			return [name, color.green(oldCell), color.red(newCell), cell, scope];
		}
		return [name, oldCell, newCell, cell, scope];
	});

	// Title row (the lockfile name) above the header, then header, then change rows.
	// Headers are Title Case to match the markdown renderer.
	const header: (string | null)[] = ['Package', 'Old', 'New', 'Change', 'Scope'];
	const titleRow: (string | null)[] = [lockfile, '', '', '', ''];
	// Bold the title row only (noop when colouring is disabled).
	const data = [titleRow.map((cell) => color.bold(cell)), header, ...rows];
	return table(data);
}

/** Render one boxed table per lockfile, blank-line separated. */
export const tableRenderer: Renderer = {
	render(lockfiles, options) {
		// `color: false` makes every style a noop, so we always call the style fns —
		// the output is identical whether or not colouring is engaged.
		const color = createColor(options.color);
		return lockfiles
			.map(({ lockfile, changes }) => renderTable(lockfile, changes, color))
			.join('\n\n');
	},
};
