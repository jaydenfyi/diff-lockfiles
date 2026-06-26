import { markdownTable } from 'markdown-table';
import type { Change } from '../changes.js';
import type { Renderer } from './types.js';

/** Render changes as a GitHub-flavoured Markdown table. */
export const markdownRenderer: Renderer = {
  render(changes, options) {
    function formatVersionChange({ kind, oldVersion, newVersion }: Change): string {
      switch (kind) {
        case 'added':
          return `**${newVersion}** (added)`;
        case 'removed':
          return `~~${oldVersion}~~ (removed)`;
        case 'upgrade':
          return `${oldVersion} → **${newVersion}**`;
        case 'downgrade':
          return `**${oldVersion}** → ${newVersion}`;
        case 'changed':
          return `${oldVersion} → ${newVersion}`;
      }
    }

    const tableData = [
      ['Package', 'Old Version', 'New Version', 'Change'],
      ...Object.entries(changes).map(([name, change]) => [
        name,
        change.oldVersion || '—',
        change.newVersion || '—',
        formatVersionChange(change),
      ]),
    ];

    const heading = options.title && options.title !== '' ? `## ${options.title}\n\n` : '';
    return `${heading}${markdownTable(tableData)}`;
  },
};
