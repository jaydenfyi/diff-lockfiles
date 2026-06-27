import { markdownTable } from 'markdown-table';
import { displayRaw } from './highlight.js';
import type { Bump, ChangeKind, Changes } from '../changes.js';
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

/** `## <lockfile>` heading + a GitHub-flavoured Markdown table of its changes. */
function renderSection(lockfile: string, changes: Changes): string {
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
  return `## ${lockfile}\n\n${markdownTable(tableData)}`;
}

/** Render one `##` section per lockfile, separated by a blank line. */
export const markdownRenderer: Renderer = {
  render(lockfiles) {
    return lockfiles.map(({ lockfile, changes }) => renderSection(lockfile, changes)).join('\n\n');
  },
};
