import { describe, expect, test } from 'vitest';

import {
  getJobTableChromeColors,
  isJobRowsPerPage,
  JOB_ROWS_PER_PAGE_OPTIONS,
  JOB_TABLE_CHROME_CONTROL_HEIGHT,
  JOB_TABLE_CHROME_ROW_MIN_HEIGHT,
  JOB_TABLE_FOOTER_CONTROL_WIDTH,
  JOB_TABLE_HEADER_HEIGHT,
  JOB_TABLE_ROW_HEIGHT,
  JOB_TABLE_TOOLBAR_CONTROL_HEIGHT,
} from './constants';

describe('job table pagination constants', () => {
  test('accepts every configured rows-per-page option', () => {
    expect(JOB_ROWS_PER_PAGE_OPTIONS).toEqual([25, 50, 100]);
    expect(JOB_ROWS_PER_PAGE_OPTIONS.every(isJobRowsPerPage)).toBe(true);
  });

  test('rejects unsupported row counts', () => {
    expect(isJobRowsPerPage(0)).toBe(false);
    expect(isJobRowsPerPage(10)).toBe(false);
    expect(isJobRowsPerPage(24)).toBe(false);
    expect(isJobRowsPerPage(Number.NaN)).toBe(false);
  });

  test('uses a compact header without changing the body row height', () => {
    expect(JOB_TABLE_CHROME_CONTROL_HEIGHT).toBe(32);
    expect(JOB_TABLE_FOOTER_CONTROL_WIDTH).toBe(44);
    expect(JOB_TABLE_CHROME_ROW_MIN_HEIGHT).toBe(40);
    expect(JOB_TABLE_TOOLBAR_CONTROL_HEIGHT).toBe(40);
    expect(JOB_TABLE_HEADER_HEIGHT).toBe(42);
    expect(JOB_TABLE_ROW_HEIGHT).toBe(44);
  });
});

describe('job table chrome colours', () => {
  test('provides distinct, high-contrast styling for light and dark themes', () => {
    expect(getJobTableChromeColors('light')).toEqual({
      surface: '#ffffff',
      header: '#f4f6f8',
      border: '#c7ced6',
      text: '#263238',
      accent: '#1565c0',
      accentContrast: '#ffffff',
      hover: '#eef1f4',
    });
    expect(getJobTableChromeColors('dark')).toEqual({
      surface: '#1f252b',
      header: '#29313a',
      border: '#46515c',
      text: '#f5f7fa',
      accent: '#90caf9',
      accentContrast: '#102a43',
      hover: '#34404c',
    });
  });
});
