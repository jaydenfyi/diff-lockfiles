import { createColor } from '../colors.js';
import { displayRaw, highlightVersion } from './highlight.js';
import type { Renderer } from './types.js';

/**
 * Render changes as one line per package:
 *   `name old -> new <bump> · scope` (with added/removed special-cased).
 * The bumped version segment is bolded; the whole old→new span is coloured by
 * direction (green up, red down).
 */
export const textRenderer: Renderer = {
  render(changes, options) {
    // `color: false` makes every style a noop, so we always call the style fns —
    // the output is identical whether or not colouring is engaged.
    const color = createColor(options.color);

    return Object.entries(changes)
      .map(([name, { kind, oldVersion, newVersion, bump, scope }]) => {
        const scopeSuffix = ` · ${scope}`;
        switch (kind) {
          case 'added':
            return `${name} ${color.green('added')} ${displayRaw(newVersion)}${scopeSuffix}`;
          case 'removed':
            return `${name} ${color.red('removed')} ${displayRaw(oldVersion)}${scopeSuffix}`;
          case 'upgrade':
          case 'downgrade': {
            // Direction maps directly to colour: upgrades green, downgrades red.
            const paint = kind === 'upgrade' ? color.green : color.red;
            return `${name} ${paint(`${highlightVersion(oldVersion, bump, color)} -> ${highlightVersion(newVersion, bump, color)} ${bump}`)}${scopeSuffix}`;
          }
          case 'changed':
            // Non-semver move (git/file specifier): render plainly, no colour.
            return `${name} ${displayRaw(oldVersion)} -> ${displayRaw(newVersion)}${scopeSuffix}`;
        }
      })
      .join('\n');
  },
};
