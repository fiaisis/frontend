import { afterEach, describe, expect, test, vi } from 'vitest';

import { parseJobOutputs } from './hooks';

describe('parseJobOutputs', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('returns an empty array for missing output values', () => {
    expect(parseJobOutputs(null)).toEqual([]);
  });

  test('wraps a single output string in an array', () => {
    expect(parseJobOutputs('LOQ00012345.nxs')).toEqual(['LOQ00012345.nxs']);
  });

  test('parses Python-style string arrays returned by the jobs API', () => {
    expect(parseJobOutputs("['first.nxs', 'second.nxs']")).toEqual(['first.nxs', 'second.nxs']);
  });

  test('returns an empty array and logs when array output cannot be parsed', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(parseJobOutputs('[not valid json]')).toEqual([]);
    expect(consoleError).toHaveBeenCalled();
  });
});
