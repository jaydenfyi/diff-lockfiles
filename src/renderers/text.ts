import chalk from 'chalk';
import semver from 'semver';
import type { Renderer } from './types.js';

/** Render changes as one line per package: `name added | removed | old -> new`. */
export const textRenderer: Renderer = {
  render(changes, options) {
    const lines: string[] = [];
    for (const [name, [oldVersion, newVersion]] of Object.entries(changes)) {
      if (!oldVersion) {
        lines.push(options.color ? `${name} ${chalk.green('added')}` : `${name} added`);
      } else if (!newVersion) {
        lines.push(options.color ? `${name} ${chalk.red('removed')}` : `${name} removed`);
      } else if (!semver.eq(oldVersion, newVersion)) {
        if (options.color) {
          const color = semver.gt(oldVersion, newVersion) ? chalk.red : chalk.green;
          lines.push(`${name} ${color(`${oldVersion} -> ${newVersion}`)}`);
        } else {
          lines.push(`${name} ${oldVersion} -> ${newVersion}`);
        }
      }
    }
    return lines.join('\n');
  },
};
