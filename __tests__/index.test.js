import { diff, format } from '../lib/index.js';

describe('diff', () => {
  it('returns an empty object when given two empty objects', () => {
    const oldLock = {
      packages: {},
    };

    const newLock = {
      packages: {},
    };

    const changes = diff(oldLock, newLock);

    expect(changes).toEqual({});
  });
});

describe('format', () => {
  const changes = {
    'node_modules/foo': ['1.0.0', '2.0.0'],
    'node_modules/bar': [null, '1.0.0'],
    'node_modules/baz': ['3.0.0', null],
  };

  it('returns empty string for empty changes with text format', () => {
    expect(format({}, { format: 'text' })).toBe('');
  });

  it('returns empty object string for empty changes with json format', () => {
    expect(format({}, { format: 'json' })).toBe('{}');
  });

  it('returns JSON string for json format', () => {
    const result = format(changes, { format: 'json' });
    expect(JSON.parse(result)).toEqual(changes);
  });

  it('returns text with arrows for text format', () => {
    const result = format(changes, { format: 'text', color: false });
    expect(result).toContain('node_modules/foo 1.0.0 -> 2.0.0');
    expect(result).toContain('node_modules/bar added');
    expect(result).toContain('node_modules/baz removed');
  });

  it('returns markdown table for markdown format', () => {
    const result = format(changes, { format: 'markdown' });
    expect(result).toContain('| Package');
    expect(result).toContain('node_modules/foo');
  });

  it('returns table for table format', () => {
    const result = format(changes, { format: 'table', title: '', color: false });
    expect(result).toContain('package');
    expect(result).toContain('node_modules/foo');
  });

  it('includes title in markdown format', () => {
    const result = format(changes, { format: 'markdown', title: 'package-lock.json' });
    expect(result).toContain('## package-lock.json');
  });

  it('defaults to text format', () => {
    const result = format(changes, { format: 'unknown', color: false });
    expect(result).toContain('node_modules/foo 1.0.0 -> 2.0.0');
  });
});
