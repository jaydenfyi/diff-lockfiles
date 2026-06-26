import { createColor } from '../colors.js';
import type { Renderer } from './types.js';

/** Render changes as one line per package: `name added | removed | old -> new`. */
export const textRenderer: Renderer = {
  render(changes, options) {
    // `color: false` makes every style a noop, so we always call the style fns —
    // the output is identical whether or not colouring is engaged.
    const color = createColor(options.color);

    return Object.entries(changes)
      .map(([name, { kind, oldVersion, newVersion }]) => {
        switch (kind) {
          case 'added':
            return `${name} ${color.green('added')}`;
          case 'removed':
            return `${name} ${color.red('removed')}`;
          case 'upgrade':
            return `${name} ${color.green(`${oldVersion} -> ${newVersion}`)}`;
          case 'downgrade':
            return `${name} ${color.red(`${oldVersion} -> ${newVersion}`)}`;
          case 'changed':
            // Non-semver move (git/file specifier): render plainly, no colour.
            return `${name} ${oldVersion} -> ${newVersion}`;
        }
      })
      .join('\n');
  },
};
