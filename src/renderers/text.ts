import chalk from 'chalk';
import semver from 'semver';
import type { Renderer } from './types.js';

/** Render changes as one line per package: `name added | removed | old -> new`. */
export const textRenderer: Renderer = {
  render(changes, options) {
    return Object.entries(changes)
      .map(([name, [oldVersion, newVersion]]): string | null => {
        if (!oldVersion) {
          return options.color ? `${name} ${chalk.green('added')}` : `${name} added`;
        }
        if (!newVersion) {
          return options.color ? `${name} ${chalk.red('removed')}` : `${name} removed`;
        }
        if (!semver.eq(oldVersion, newVersion)) {
          if (!options.color) return `${name} ${oldVersion} -> ${newVersion}`;
          const color = semver.gt(oldVersion, newVersion) ? chalk.red : chalk.green;
          return `${name} ${color(`${oldVersion} -> ${newVersion}`)}`;
        }
        // Unchanged: emit nothing for this entry.
        return null;
      })
      .filter((line): line is string => line !== null)
      .join('\n');
  },
};
