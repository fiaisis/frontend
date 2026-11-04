import { describe, expect, test } from 'vitest';

import { getAxisDisplay, getHoverLabel } from './axisLabels';

describe('getAxisDisplay', () => {
  test('uses short_name and long_name when the file provides them', () => {
    expect(getAxisDisplay(0, { short_name: 'E', long_name: 'Energy transfer (meV)' })).toEqual({
      short: 'E',
      long: 'Energy transfer (meV)',
    });
  });

  test('falls back to the long name when there is no short_name', () => {
    expect(getAxisDisplay(3, { long_name: 'H (rtu)' })).toEqual({ short: 'H (rtu)', long: 'H (rtu)' });
  });

  test('falls back to the short name when there is no long_name', () => {
    expect(getAxisDisplay(1, { short_name: 'L' })).toEqual({ short: 'L', long: 'L' });
  });

  test('falls back to the dimension index for files written before axes were named', () => {
    // The scale dataset's own name must not leak in: `D0` holds the H boundaries but describes
    // signal dimension 3, so an unnamed dimension 0 has to read `D0`, never `D3`.
    expect(getAxisDisplay(0, {})).toEqual({ short: 'D0', long: 'D0' });
    expect(getAxisDisplay(3, {})).toEqual({ short: 'D3', long: 'D3' });
  });

  test('ignores empty attributes', () => {
    expect(getAxisDisplay(2, { short_name: '', long_name: '' })).toEqual({ short: 'D2', long: 'D2' });
  });

  test('ignores non-string attributes', () => {
    expect(getAxisDisplay(0, { short_name: 3, long_name: null })).toEqual({ short: 'D0', long: 'D0' });
  });
});

describe('getHoverLabel', () => {
  test('returns the long name when it adds something', () => {
    expect(getHoverLabel({ short: 'E', long: 'Energy transfer (meV)' })).toBe('Energy transfer (meV)');
  });

  test('returns nothing when there is nothing to add', () => {
    expect(getHoverLabel({ short: 'H (rtu)', long: 'H (rtu)' })).toBeUndefined();
    expect(getHoverLabel({ short: 'D1', long: 'D1' })).toBeUndefined();
  });

  test('returns nothing for a dimension with no axis', () => {
    expect(getHoverLabel(undefined)).toBeUndefined();
  });
});
