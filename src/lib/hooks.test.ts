import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { fiaApi } from './api';
import { parseJobOutputs, useFetchJobs, useFetchTotalCount } from './hooks';

import type { Job } from './types';
import type { Dispatch, SetStateAction } from 'react';

vi.mock('./api', () => ({
  fiaApi: {
    get: vi.fn(),
  },
}));

describe('parseJobOutputs', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
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

describe('useFetchJobs', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  test('fetches jobs with the supplied query string and stores the response data', async () => {
    const jobs = [{ id: 1 }] as Job[];
    const setJobs = vi.fn() as Dispatch<SetStateAction<Job[]>>;

    vi.mocked(fiaApi.get).mockResolvedValue({ data: jobs });

    const { result } = renderHook(() => useFetchJobs('/jobs', 'limit=25&page=2', setJobs));

    await act(async () => {
      await result.current();
    });

    expect(fiaApi.get).toHaveBeenCalledWith('/jobs?limit=25&page=2');
    expect(setJobs).toHaveBeenCalledWith(jobs);
  });

  test('logs fetch failures without updating jobs', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const setJobs = vi.fn() as Dispatch<SetStateAction<Job[]>>;
    const error = new Error('request failed');

    vi.mocked(fiaApi.get).mockRejectedValue(error);

    const { result } = renderHook(() => useFetchJobs('/jobs', 'limit=25', setJobs));

    await act(async () => {
      await result.current();
    });

    expect(setJobs).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledWith('Error fetching jobs:', error);
  });
});

describe('useFetchTotalCount', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  test('fetches the total row count and stores the count value', async () => {
    const setTotalRows = vi.fn() as Dispatch<SetStateAction<number>>;

    vi.mocked(fiaApi.get).mockResolvedValue({ data: { count: 42 } });

    const { result } = renderHook(() => useFetchTotalCount('/jobs/count', 'instrument=LOQ', setTotalRows));

    await act(async () => {
      await result.current();
    });

    expect(fiaApi.get).toHaveBeenCalledWith('/jobs/count?instrument=LOQ');
    expect(setTotalRows).toHaveBeenCalledWith(42);
  });

  test('logs count fetch failures without updating the total', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const setTotalRows = vi.fn() as Dispatch<SetStateAction<number>>;
    const error = new Error('count failed');

    vi.mocked(fiaApi.get).mockRejectedValue(error);

    const { result } = renderHook(() => useFetchTotalCount('/jobs/count', 'instrument=LOQ', setTotalRows));

    await act(async () => {
      await result.current();
    });

    expect(setTotalRows).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledWith('Error fetching row count:', error);
  });
});
