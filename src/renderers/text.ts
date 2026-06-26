import semver from 'semver';
import { createColor } from '../colors.js';
import type { Renderer } from './types.js';

/** Render changes as one line per package: `name added | removed | old -> new`. */
export const textRenderer: Renderer = {
  render(changes, options) {
    // `color: false` makes every style a noop, so we always call the style fns —
    // the output is identical whether or not colouring is engaged.
    const color = createColor(options.color);

    return Object.entries(changes)
      .map(([name, [oldVersion, newVersion]]): string | null => {
        if (!oldVersion) {
          return `${name} ${color.green('added')}`;
        }
        if (!newVersion) {
          return `${name} ${color.red('removed')}`;
        }
        if (!semver.eq(oldVersion, newVersion)) {
          const paint = semver.gt(oldVersion, newVersion) ? color.red : color.green;
          return `${name} ${paint(`${oldVersion} -> ${newVersion}`)}`;
        }
        // Unchanged: emit nothing for this entry.
        return null;
      })
      .filter((line): line is string => line !== null)
      .join('\n');
  },
};
