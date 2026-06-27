import { createColor } from '../colors.js';
import { displayRaw, highlightVersion } from './highlight.js';
import type { Change } from '../changes.js';
import type { Renderer } from './types.js';

/** One package's change as a single line. */
function formatChange(name: string, change: Change, color: ReturnType<typeof createColor>): string {
  const { kind, oldVersion, newVersion, bump, scope } = change;
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
}

/**
 * Render one section per lockfile: a `── <lockfile> ──` divider header followed
 * by one line per change. Sections are blank-line separated. An empty run
 * yields `''` (printed as nothing). A lockfile with no changes contributes no
 * section.
 */
export const textRenderer: Renderer = {
  render(lockfiles, options) {
    // `color: false` makes every style a noop, so we always call the style fns —
    // the output is identical whether or not colouring is engaged.
    const color = createColor(options.color);
    const sections = lockfiles.map(({ lockfile, changes }) => {
      const body = Object.entries(changes)
        .map(([name, change]) => formatChange(name, change, color))
        .join('\n');
      return body === '' ? '' : `${color.bold(`── ${lockfile} ──`)}\n${body}`;
    });
    return sections.filter((s) => s !== '').join('\n\n');
  },
};
