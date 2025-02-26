import React, { useCallback } from 'react';
import { fiaApi } from './api';

import { Job } from './types';

export const useFetchJobs = (
  apiPath: string,
  queryParams: string,
  setJobs: React.Dispatch<React.SetStateAction<Job[]>>
): (() => Promise<void>) => {
  return useCallback(async () => {
    fiaApi
      .get(`${apiPath}?${queryParams}`)
      .then((res) => res.data)
      .then((jobs) => setJobs(jobs))
      .catch((err) => console.error('Error fetching jobs:', err));
  }, [apiPath, queryParams, setJobs]);
};

export const useFetchTotalCount = (
  apiPath: string,
  query: string,
  setTotalRows: React.Dispatch<React.SetStateAction<number>>
): (() => Promise<void>) => {
  return useCallback(async () => {
    fiaApi
      .get(`${apiPath}?${query}`)
      .then((res) => setTotalRows(res.data.count))
      .catch((err) => console.error('Error fetching row count', err.message));
  }, [apiPath, setTotalRows, query]);
};
