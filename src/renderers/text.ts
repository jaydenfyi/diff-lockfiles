import semver from 'semver';
import { createColors } from '../colors.js';
import type { Renderer } from './types.js';

/** Render changes as one line per package: `name added | removed | old -> new`. */
export const textRenderer: Renderer = {
  render(changes, options) {
    // `color: false` makes every style a noop, so we always call the style fns —
    // the output is identical whether or not colouring is engaged.
    const colors = createColors(options.color);

    return Object.entries(changes)
      .map(([name, [oldVersion, newVersion]]): string | null => {
        if (!oldVersion) {
          return `${name} ${colors.green('added')}`;
        }
        if (!newVersion) {
          return `${name} ${colors.red('removed')}`;
        }
        if (!semver.eq(oldVersion, newVersion)) {
          const color = semver.gt(oldVersion, newVersion) ? colors.red : colors.green;
          return `${name} ${color(`${oldVersion} -> ${newVersion}`)}`;
        }
        // Unchanged: emit nothing for this entry.
        return null;
      })
      .filter((line): line is string => line !== null)
      .join('\n');
  },
};
