import { table } from 'table';
import { createColor } from '../colors.js';
import { highlightVersion } from './highlight.js';
import type { Bump, ChangeKind } from '../changes.js';
import type { Renderer } from './types.js';

/** Compact change indicator for the table's `change` column. */
function changeCell(kind: ChangeKind, bump: Bump | null): string {
  switch (kind) {
    case 'upgrade':
      return `↑ ${bump}`;
    case 'downgrade':
      return `↓ ${bump}`;
    case 'added':
      return 'added';
    case 'removed':
      return 'removed';
    case 'changed':
      return 'changed';
  }
}

/** Render changes as a boxed table (package | old | new | change). */
export const tableRenderer: Renderer = {
  render(changes, options) {
    // `color: false` makes every style a noop, so we always call the style fns —
    // the output is identical whether or not colouring is engaged.
    const color = createColor(options.color);

    const rows = Object.entries(changes).map(([name, { kind, oldVersion, newVersion, bump }]) => {
      const oldCell = highlightVersion(oldVersion, bump, color);
      const newCell = highlightVersion(newVersion, bump, color);
      const cell = changeCell(kind, bump);
      if (kind === 'upgrade') return [name, color.red(oldCell), color.green(newCell), cell];
      if (kind === 'downgrade') return [name, color.green(oldCell), color.red(newCell), cell];
      // added / removed / changed: render the raw values plainly.
      return [name, oldCell, newCell, cell];
    });

    // Header row, then optionally a title row above it.
    const header: (string | null)[] = ['package', 'old', 'new', 'change'];
    const titleRow: (string | null)[] | null =
      options.title !== '' ? [options.title, '', '', ''] : null;
    const titled = titleRow ? [titleRow, header, ...rows] : [header, ...rows];

    // Bold the first (top) row only (noop when colouring is disabled).
    const data = [titled[0].map((cell) => color.bold(cell)), ...titled.slice(1)];

    return table(data);
  },
};
