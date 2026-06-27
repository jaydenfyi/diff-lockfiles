import type { Bump, ChangeKind } from '../changes.js';

/**
 * The canonical human-readable label for a change's {@link ChangeKind} and
 * semver magnitude {@link Bump}.
 *
 * Single source of truth shared by every text-oriented renderer (text, table,
 * markdown) so the same change reads identically across formats. The JSON
 * renderer is intentionally excluded — it exposes `kind` + `bump` + `scope` as
 * structured fields rather than a pre-baked label, so consumers can phrase it
 * however they like.
 *
 * - `upgrade`/`downgrade` carry an arrow for direction plus the semver
 *   magnitude (`↑ minor`, `↓ major`).
 * - `added`/`removed`/`changed` are directionless and return their own name.
 *
 * `bump` is typed `Bump | null` for callers' convenience, but it is only
 * consulted on the `upgrade`/`downgrade` arms — where the pipeline guarantees a
 * non-null magnitude (both sides are present, valid semver, and differ).
 */
export function changeLabel(kind: ChangeKind, bump: Bump | null): string {
	switch (kind) {
		case 'upgrade':
			return `↑ ${bump}`;
		case 'downgrade':
			return `↓ ${bump}`;
		case 'added':
			return 'added';
		case 'removed':
			return 'removed';
		case 'changed':
			return 'changed';
	}
}
