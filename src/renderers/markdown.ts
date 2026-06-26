import semver from 'semver';
import { markdownTable } from 'markdown-table';
import type { Renderer } from './types.js';

/** Render changes as a GitHub-flavoured Markdown table. */
export const markdownRenderer: Renderer = {
  render(changes, options) {
    function formatVersionChange(oldVersion: string | null, newVersion: string | null): string {
      if (!oldVersion) return `**${newVersion}** (added)`;
      if (!newVersion) return `~~${oldVersion}~~ (removed)`;
      if (semver.valid(oldVersion) && semver.valid(newVersion)) {
        if (semver.lt(oldVersion, newVersion)) {
          return `${oldVersion} → **${newVersion}**`;
        }
        if (semver.gt(oldVersion, newVersion)) {
          return `**${oldVersion}** → ${newVersion}`;
        }
      }
      return `${oldVersion} → ${newVersion}`;
    }

    const tableData = [
      ['Package', 'Old Version', 'New Version', 'Change'],
      ...Object.entries(changes).map(([name, [oldVersion, newVersion]]) => [
        name,
        oldVersion || '—',
        newVersion || '—',
        formatVersionChange(oldVersion, newVersion),
      ]),
    ];

    let out = '';
    if (options.title && options.title !== '') {
      out += `## ${options.title}\n\n`;
    }
    out += markdownTable(tableData);
    return out;
  },
};
