import chalk from 'chalk';
import semver from 'semver';
import { table } from 'table';
import type { Renderer } from './types.js';

/** Render changes as a boxed table (package | old version | new version). */
export const tableRenderer: Renderer = {
  render(changes, options) {
    let data: (string | null)[][] = Object.entries(changes).map(
      ([name, [oldVersion, newVersion]]) => [name, oldVersion, newVersion],
    );

    if (options.color) {
      data = data.map(([name, oldVersion, newVersion]) => {
        if (oldVersion && newVersion && semver.valid(oldVersion) && semver.valid(newVersion)) {
          if (semver.lt(oldVersion, newVersion)) {
            oldVersion = chalk.red(oldVersion);
            newVersion = chalk.green(newVersion);
          } else if (semver.gt(oldVersion, newVersion)) {
            oldVersion = chalk.green(oldVersion);
            newVersion = chalk.red(newVersion);
          }
        }
        return [name, oldVersion, newVersion];
      });
    }

    data.unshift(['package', 'old version', 'new version']);
    if (options.title !== '') {
      data.unshift([options.title, '', '']);
    }

    if (options.color) {
      data[0] = data[0].map((heading) => chalk.bold(heading));
    }

    return table(data);
  },
};
