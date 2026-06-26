import chalk from 'chalk';
import semver from 'semver';
import { table } from 'table';
import type { Renderer } from './types.js';

/** Render changes as a boxed table (package | old version | new version). */
export const tableRenderer: Renderer = {
  render(changes, options) {
    const rows = Object.entries(changes).map(([name, [oldVersion, newVersion]]) => {
      if (
        options.color &&
        oldVersion &&
        newVersion &&
        semver.valid(oldVersion) &&
        semver.valid(newVersion)
      ) {
        if (semver.lt(oldVersion, newVersion)) {
          return [name, chalk.red(oldVersion), chalk.green(newVersion)];
        }
        if (semver.gt(oldVersion, newVersion)) {
          return [name, chalk.green(oldVersion), chalk.red(newVersion)];
        }
      }
      return [name, oldVersion, newVersion];
    });

    // Header row, then optionally a title row above it.
    const header: (string | null)[] = ['package', 'old version', 'new version'];
    const titleRow: (string | null)[] | null = options.title !== '' ? [options.title, '', ''] : null;
    const titled = titleRow ? [titleRow, header, ...rows] : [header, ...rows];

    // When colouring, bold the first (top) row only.
    const data = options.color
      ? [titled[0].map((cell) => chalk.bold(cell)), ...titled.slice(1)]
      : titled;

    return table(data);
  },
};
