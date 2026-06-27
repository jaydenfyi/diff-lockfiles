import { displayRaw } from './highlight.js';
import type { Change } from '../changes.js';

/** The identity of a rendered row: everything that would make two rows look identical. */
function rowSignature(change: Change): string {
	return [
		change.name,
		change.kind,
		displayRaw(change.oldVersion),
		displayRaw(change.newVersion),
		change.scope,
	].join('\u0000');
}

/**
 * A provenance hint for a change, shown only when a rendered row would collide
 * with another. Prefers an `old -> new` transition; otherwise the single
 * present source key.
 */
function sourceHint(change: Change): string | null {
	if (change.oldSourceKey && change.newSourceKey && change.oldSourceKey !== change.newSourceKey) {
		return `${change.oldSourceKey} -> ${change.newSourceKey}`;
	}
	return change.oldSourceKey ?? change.newSourceKey;
}

/**
 * One display label per change (index-aligned with the input array). The bare
 * package name by default; when two or more changes share an identical rendered
 * row signature, each appends `(sourceKey)` provenance so the rows stay distinct.
 */
export function packageLabels(changes: Change[]): string[] {
	const counts = new Map<string, number>();
	for (const change of changes) {
		const signature = rowSignature(change);
		counts.set(signature, (counts.get(signature) ?? 0) + 1);
	}

	return changes.map((change) => {
		const duplicate = (counts.get(rowSignature(change)) ?? 0) > 1;
		const hint = duplicate ? sourceHint(change) : null;
		return hint ? `${change.name} (${hint})` : change.name;
	});
}
