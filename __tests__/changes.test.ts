import { bumpOf, classify, isUnchanged, parseVersion } from '../src/changes.js';

describe('parseVersion', () => {
  it('parses a release semver into components', () => {
    expect(parseVersion('1.2.3')).toEqual({
      scheme: 'semver',
      raw: '1.2.3',
      major: 1,
      minor: 2,
      patch: 3,
    });
  });

  it('exposes prerelease and omits it when absent', () => {
    expect(parseVersion('2.1.0-beta.1')).toEqual({
      scheme: 'semver',
      raw: '2.1.0-beta.1',
      major: 2,
      minor: 1,
      patch: 0,
      prerelease: 'beta.1',
    });
    expect(parseVersion('2.1.0')).toEqual({
      scheme: 'semver',
      raw: '2.1.0',
      major: 2,
      minor: 1,
      patch: 0,
    });
  });

  it('exposes build metadata and omits it when absent', () => {
    expect(parseVersion('1.0.0+build.5')).toEqual({
      scheme: 'semver',
      raw: '1.0.0+build.5',
      major: 1,
      minor: 0,
      patch: 0,
      build: 'build.5',
    });
    expect(parseVersion('1.0.0')).toEqual({
      scheme: 'semver',
      raw: '1.0.0',
      major: 1,
      minor: 0,
      patch: 0,
    });
  });

  it('falls back to nonsemver for git/file specifiers', () => {
    expect(parseVersion('github:a/b#abc')).toEqual({ scheme: 'nonsemver', raw: 'github:a/b#abc' });
  });

  it('accepts a v-prefixed input as semver, preserving the raw string', () => {
    const version = parseVersion('v1.2.3');
    expect(version.scheme).toBe('semver');
    expect(version).toMatchObject({ major: 1, minor: 2, patch: 3, raw: 'v1.2.3' });
  });
});

describe('classify', () => {
  it('is "added" when only the new version is present', () => {
    expect(classify(null, parseVersion('1.0.0'))).toBe('added');
  });

  it('is "removed" when only the old version is present', () => {
    expect(classify(parseVersion('1.0.0'), null)).toBe('removed');
  });

  it('is "upgrade" when the new version is higher', () => {
    expect(classify(parseVersion('1.0.0'), parseVersion('2.0.0'))).toBe('upgrade');
  });

  it('is "downgrade" when the new version is lower', () => {
    expect(classify(parseVersion('2.0.0'), parseVersion('1.0.0'))).toBe('downgrade');
  });

  it('is "changed" when both are valid and equal', () => {
    expect(classify(parseVersion('1.0.0'), parseVersion('1.0.0'))).toBe('changed');
  });

  it('is "changed" (not a throw) for non-semver specifiers like git URLs', () => {
    expect(classify(parseVersion('git+ssh://host/a'), parseVersion('git+ssh://host/b'))).toBe(
      'changed',
    );
  });
});

describe('bumpOf', () => {
  it('maps each semver.diff arm to a magnitude', () => {
    const parse = (raw: string) => parseVersion(raw);
    expect(bumpOf(parse('1.0.0'), parse('2.0.0'))).toBe('major'); // major
    expect(bumpOf(parse('1.0.0'), parse('2.0.0-beta.1'))).toBe('major'); // premajor
    expect(bumpOf(parse('1.0.0'), parse('1.1.0'))).toBe('minor'); // minor
    expect(bumpOf(parse('1.0.0'), parse('1.1.0-beta.1'))).toBe('minor'); // preminor
    expect(bumpOf(parse('1.0.0'), parse('1.0.1'))).toBe('patch'); // patch
    expect(bumpOf(parse('1.0.0'), parse('1.0.1-beta.1'))).toBe('patch'); // prepatch
    expect(bumpOf(parse('1.0.0-beta.1'), parse('1.0.0-beta.2'))).toBe('patch'); // prerelease
  });

  it('is null for build-only changes', () => {
    expect(bumpOf(parseVersion('1.0.0+build1'), parseVersion('1.0.0+build2'))).toBeNull();
  });

  it('is null when a side is missing', () => {
    expect(bumpOf(null, parseVersion('1.0.0'))).toBeNull();
    expect(bumpOf(parseVersion('1.0.0'), null)).toBeNull();
  });

  it('is null for non-semver specifiers', () => {
    expect(bumpOf(parseVersion('git+ssh://host/a'), parseVersion('git+ssh://host/b'))).toBeNull();
  });
});

describe('isUnchanged', () => {
  it('is true for equal valid versions', () => {
    expect(isUnchanged(parseVersion('1.0.0'), parseVersion('1.0.0'))).toBe(true);
  });

  it('is false for differing valid versions', () => {
    expect(isUnchanged(parseVersion('1.0.0'), parseVersion('2.0.0'))).toBe(false);
  });

  it('is false when a side is missing (added/removed)', () => {
    expect(isUnchanged(null, parseVersion('1.0.0'))).toBe(false);
    expect(isUnchanged(parseVersion('1.0.0'), null)).toBe(false);
  });

  it('is true for build-only changes (eq ignores build metadata)', () => {
    expect(isUnchanged(parseVersion('1.0.0+build1'), parseVersion('1.0.0+build2'))).toBe(true);
  });

  it('is true for equal non-semver specifiers (no throw)', () => {
    expect(isUnchanged(parseVersion('git+ssh://host/a'), parseVersion('git+ssh://host/a'))).toBe(
      true,
    );
  });

  it('is false for differing non-semver specifiers (no throw)', () => {
    expect(isUnchanged(parseVersion('git+ssh://host/a'), parseVersion('git+ssh://host/b'))).toBe(
      false,
    );
  });
});
