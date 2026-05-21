import { describe, expect, test } from 'vitest';

import { instruments, isValidInstrument, VALID_INSTRUMENT_NAMES } from './instrumentData';

describe('instrumentData', () => {
  test('validates instrument names case-insensitively', () => {
    expect(isValidInstrument('LOQ')).toBe(true);
    expect(isValidInstrument('loq')).toBe(true);
    expect(isValidInstrument('LoQ')).toBe(true);
  });

  test('rejects missing and unknown instrument names', () => {
    expect(isValidInstrument(undefined)).toBe(false);
    expect(isValidInstrument('')).toBe(false);
    expect(isValidInstrument('NOT_REAL')).toBe(false);
  });

  test('exports uppercase unique valid instrument names for every instrument', () => {
    expect(VALID_INSTRUMENT_NAMES).toHaveLength(instruments.length);
    expect(new Set(VALID_INSTRUMENT_NAMES).size).toBe(VALID_INSTRUMENT_NAMES.length);
    expect(VALID_INSTRUMENT_NAMES.every((name) => name === name.toUpperCase())).toBe(true);
    expect(VALID_INSTRUMENT_NAMES).toContain('IMAT');
    expect(VALID_INSTRUMENT_NAMES).toContain('SANS2D');
  });
});
