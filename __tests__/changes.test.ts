import { classify, isUnchanged } from '../src/changes.js';

describe('classify', () => {
  it('is "added" when only the new version is present', () => {
    expect(classify(null, '1.0.0')).toBe('added');
  });

  it('is "removed" when only the old version is present', () => {
    expect(classify('1.0.0', null)).toBe('removed');
  });

  it('is "upgrade" when the new version is higher', () => {
    expect(classify('1.0.0', '2.0.0')).toBe('upgrade');
  });

  it('is "downgrade" when the new version is lower', () => {
    expect(classify('2.0.0', '1.0.0')).toBe('downgrade');
  });

  it('is "changed" when both are valid and equal', () => {
    expect(classify('1.0.0', '1.0.0')).toBe('changed');
  });

  it('is "changed" (not a throw) for non-semver specifiers like git URLs', () => {
    expect(classify('git+ssh://host/a', 'git+ssh://host/b')).toBe('changed');
  });
});

describe('isUnchanged', () => {
  it('is true for equal valid versions', () => {
    expect(isUnchanged('1.0.0', '1.0.0')).toBe(true);
  });

  it('is false for differing valid versions', () => {
    expect(isUnchanged('1.0.0', '2.0.0')).toBe(false);
  });

  it('is false when a side is missing (added/removed)', () => {
    expect(isUnchanged(null, '1.0.0')).toBe(false);
    expect(isUnchanged('1.0.0', null)).toBe(false);
  });

  it('is true for equal non-semver specifiers (no throw)', () => {
    expect(isUnchanged('git+ssh://host/a', 'git+ssh://host/a')).toBe(true);
  });

  it('is false for differing non-semver specifiers (no throw)', () => {
    expect(isUnchanged('git+ssh://host/a', 'git+ssh://host/b')).toBe(false);
  });
});
