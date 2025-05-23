import React, { useCallback } from 'react';
import { fiaApi } from './api';

import { Job } from './types';

export const useFetchJobs = (
  apiPath: string,
  queryParams: string,
  setJobs: React.Dispatch<React.SetStateAction<Job[]>>
): (() => Promise<void>) => {
  return useCallback(async () => {
    try {
      const res = await fiaApi.get(`${apiPath}?${queryParams}`);
      setJobs(res.data);
    } catch (err) {
      console.error('Error fetching jobs:', err);
    }
  }, [apiPath, queryParams, setJobs]);
};

export const useFetchTotalCount = (
  apiPath: string,
  query: string,
  setTotalRows: React.Dispatch<React.SetStateAction<number>>
): (() => Promise<void>) => {
  return useCallback(async () => {
    try {
      const res = await fiaApi.get(`${apiPath}?${query}`);
      setTotalRows(res.data.count);
    } catch (err) {
      console.error('Error fetching row count:', err);
    }
  }, [apiPath, setTotalRows, query]);
};

export const parseJobOutputs = (outputs: string | null): string[] => {
  if (!outputs || typeof outputs !== 'string') return [];
  try {
    if (outputs.startsWith('[') && outputs.endsWith(']')) {
      return JSON.parse(outputs.replace(/'/g, '"'));
    } else {
      return [outputs];
    }
  } catch (err) {
    console.error('Failed to parse outputs:', err);
    return [];
  }
};
