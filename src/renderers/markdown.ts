import { markdownTable } from 'markdown-table';
import { changeLabel } from './change-label.js';
import { displayRaw } from './highlight.js';
import { packageLabels } from './display-name.js';
import type { Changes } from '../changes.js';
import type { Renderer } from './types.js';

/** `## <lockfile>` heading + a GitHub-flavoured Markdown table of its changes. */
function renderSection(lockfile: string, changes: Changes): string {
	const labels = packageLabels(changes);
	const tableData = [
		['Package', 'Old', 'New', 'Change', 'Scope'],
		...changes.map((change, index) => {
			const { oldVersion, newVersion, kind, bump, scope } = change;
			return [
				labels[index],
				`\`${displayRaw(oldVersion)}\``,
				`\`${displayRaw(newVersion)}\``,
				changeLabel(kind, bump),
				scope,
			];
		}),
	];
	return `## ${lockfile}\n\n${markdownTable(tableData)}`;
}

/** Render one `##` section per lockfile, separated by a blank line. */
export const markdownRenderer: Renderer = {
	render(lockfiles) {
		return lockfiles.map(({ lockfile, changes }) => renderSection(lockfile, changes)).join('\n\n');
	},
};
