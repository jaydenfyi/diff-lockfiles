import type { Bump, Version } from '../changes.js';
import type { createColor } from '../colors.js';

type ColorFns = ReturnType<typeof createColor>;

/** The raw version string, or `—` when the version is absent. */
export function displayRaw(version: Version | null): string {
	return version === null ? '—' : version.raw;
}

/**
 * Render a {@link Version} as a string, bolding from the bumped segment onward
 * when the version is semver and a bump magnitude is known (major → whole
 * version; minor → `.minor.patch…`; patch → `.patch…`). When colouring is
 * disabled `bold` is a noop, so the output is the plain reconstructed version.
 *
 * Non-semver versions, unknown bumps, and missing versions fall back to
 * {@link displayRaw} (no emphasis).
 */
export function highlightVersion(
	version: Version | null,
	bump: Bump | null,
	color: ColorFns,
): string {
	if (version === null || version.scheme !== 'semver' || bump === null) return displayRaw(version);
	// Optional semver suffix: prerelease (`-x`) then build metadata (`+x`), in spec order.
	const prerelease = version.prerelease ? `-${version.prerelease}` : '';
	const build = version.build ? `+${version.build}` : '';
	const suffix = `${prerelease}${build}`;
	switch (bump) {
		case 'major':
			return color.bold(`${version.major}.${version.minor}.${version.patch}${suffix}`);
		case 'minor':
			return `${version.major}.${color.bold(`${version.minor}.${version.patch}${suffix}`)}`;
		case 'patch':
			return `${version.major}.${version.minor}.${color.bold(`${version.patch}${suffix}`)}`;
	}
}
