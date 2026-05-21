import { describe, expect, test } from 'vitest';

import { isJobRowsPerPage, JOB_ROWS_PER_PAGE_OPTIONS } from './constants';

describe('job table pagination constants', () => {
  test('accepts every configured rows-per-page option', () => {
    expect(JOB_ROWS_PER_PAGE_OPTIONS).toEqual([10, 25, 50, 100]);
    expect(JOB_ROWS_PER_PAGE_OPTIONS.every(isJobRowsPerPage)).toBe(true);
  });

  test('rejects unsupported row counts', () => {
    expect(isJobRowsPerPage(0)).toBe(false);
    expect(isJobRowsPerPage(24)).toBe(false);
    expect(isJobRowsPerPage(Number.NaN)).toBe(false);
  });
});
