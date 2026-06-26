import semver from 'semver';
import { table } from 'table';
import { createColor } from '../colors.js';
import type { Renderer } from './types.js';

/** Render changes as a boxed table (package | old version | new version). */
export const tableRenderer: Renderer = {
  render(changes, options) {
    // `color: false` makes every style a noop, so we always call the style fns —
    // the output is identical whether or not colouring is engaged.
    const color = createColor(options.color);

    const rows = Object.entries(changes).map(([name, [oldVersion, newVersion]]) => {
      if (oldVersion && newVersion && semver.valid(oldVersion) && semver.valid(newVersion)) {
        if (semver.lt(oldVersion, newVersion)) {
          return [name, color.red(oldVersion), color.green(newVersion)];
        }
        if (semver.gt(oldVersion, newVersion)) {
          return [name, color.green(oldVersion), color.red(newVersion)];
        }
      }
      return [name, oldVersion, newVersion];
    });

    // Header row, then optionally a title row above it.
    const header: (string | null)[] = ['package', 'old version', 'new version'];
    const titleRow: (string | null)[] | null = options.title !== '' ? [options.title, '', ''] : null;
    const titled = titleRow ? [titleRow, header, ...rows] : [header, ...rows];

    // Bold the first (top) row only (noop when colouring is disabled).
    const data = [titled[0].map((cell) => color.bold(cell)), ...titled.slice(1)];

    return table(data);
  },
};
