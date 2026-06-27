import { markdownTable } from 'markdown-table';
import { displayRaw } from './highlight.js';
import type { Bump, ChangeKind } from '../changes.js';
import type { Renderer } from './types.js';

/** Descriptive change label for the markdown `Change` column. */
function changeLabel(kind: ChangeKind, bump: Bump | null): string {
  switch (kind) {
    case 'upgrade':
      return `${bump} upgrade`;
    case 'downgrade':
      return `${bump} downgrade`;
    case 'added':
      return 'added';
    case 'removed':
      return 'removed';
    case 'changed':
      return 'changed';
  }
}

/** Render changes as a GitHub-flavoured Markdown table. */
export const markdownRenderer: Renderer = {
  render(changes, options) {
    const tableData = [
      ['Package', 'Old', 'New', 'Change', 'Scope'],
      ...Object.entries(changes).map(([name, { oldVersion, newVersion, kind, bump, scope }]) => [
        name,
        `\`${displayRaw(oldVersion)}\``,
        `\`${displayRaw(newVersion)}\``,
        changeLabel(kind, bump),
        scope,
      ]),
    ];

    const heading = options.title && options.title !== '' ? `## ${options.title}\n\n` : '';
    return `${heading}${markdownTable(tableData)}`;
  },
};
